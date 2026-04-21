import type { Express, Request, Response } from "express";
import type { Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { HoleResult } from "@shared/schema";
import { generateRoundSummary } from "./gemini";
import { trackGameStarted, trackGameEnded } from "./analytics";

const GOLF_API_KEY = process.env.GOLF_COURSE_API_KEY ?? "";
const GOLF_API_BASE = "https://api.golfcourseapi.com/v1";

// ============================================
// RATE LIMITERS
// ============================================
const createGameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many games created from this IP, please try again later" },
});

const summaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many summary requests, please try again later" },
});

// ============================================
// ADMIN TOKEN VALIDATION
// ============================================
async function requireAdminToken(req: Request, res: Response, gameId: string): Promise<boolean> {
  const token = req.headers["x-admin-token"];
  if (!token || Array.isArray(token)) {
    res.status(403).json({ message: "Admin token required" });
    return false;
  }
  const stored = await storage.getAdminToken(gameId);
  if (!stored || token !== stored) {
    res.status(403).json({ message: "Invalid admin token" });
    return false;
  }
  return true;
}

// ============================================
// SCORED MODE: calculate winners from net scores
// ============================================
function calculateWinnersFromNetScores(
  netScores: Record<string, number>,
  wolfId: number,
  partnerId: number | null,
  isLoneWolf: boolean,
  isBlindWolf: boolean,
  allPlayerIds: number[]
): { winnerIds: number[]; isDraw: boolean } {
  const wolfSideIds = (!isLoneWolf && !isBlindWolf && partnerId)
    ? [wolfId, partnerId]
    : [wolfId];
  const hunterIds = allPlayerIds.filter(id => !wolfSideIds.includes(id));

  const bestWolf = Math.min(...wolfSideIds.map(id => netScores[String(id)] ?? Infinity));
  const bestHunter = Math.min(...hunterIds.map(id => netScores[String(id)] ?? Infinity));

  if (bestWolf < bestHunter) return { winnerIds: wolfSideIds, isDraw: false };
  if (bestHunter < bestWolf) return { winnerIds: hunterIds, isDraw: false };
  return { winnerIds: [], isDraw: true };
}

// ============================================
// SCORING CONSTANTS
// ============================================
const SCORING_4P = {
  loneWolfWin: 4,
  loneWolfLossPerOpponent: 1,
  wolfPartnerWin: 2,
  wolfPartnerLossPerOpponent: 3,
  blindWolfWin: 6,
  blindWolfLossPerOpponent: 3,
};

const SCORING_3P = {
  loneWolfWin: 4,
  loneWolfLossPerOpponent: 2,
  wolfPartnerWin: 2,
  wolfPartnerLossPerOpponent: 3,
  blindWolfWin: 5,
  blindWolfLossPerOpponent: 3,
};

function getScoringConstants(playerCount: number) {
  return playerCount === 3 ? SCORING_3P : SCORING_4P;
}

async function recalculateAllScores(gameId: string): Promise<void> {
  const results = await storage.getHoleResults(gameId);
  const players = await storage.getPlayers(gameId);
  const playerIds = players.map(p => p.id);
  const scoring = getScoringConstants(players.length);

  const scores = new Map<number, number>(playerIds.map(id => [id, 0]));

  for (const result of results) {
    applyResultToScores(result, playerIds, scores, scoring);
  }

  for (const [playerId, score] of scores) {
    await storage.updatePlayerScore(playerId, score);
  }
}

function applyResultToScores(
  result: HoleResult,
  playerIds: number[],
  scores: Map<number, number>,
  scoring: ReturnType<typeof getScoringConstants>
): void {
  if (result.isDraw) return;

  const winnerIds = result.winnerIds ?? [];
  const isWolfWin = winnerIds.includes(result.wolfId);

  if (result.isBlindWolf) {
    if (isWolfWin) {
      scores.set(result.wolfId, (scores.get(result.wolfId) ?? 0) + scoring.blindWolfWin);
    } else {
      for (const opId of playerIds.filter(id => id !== result.wolfId)) {
        scores.set(opId, (scores.get(opId) ?? 0) + scoring.blindWolfLossPerOpponent);
      }
    }
  } else if (result.isLoneWolf) {
    if (isWolfWin) {
      scores.set(result.wolfId, (scores.get(result.wolfId) ?? 0) + scoring.loneWolfWin);
    } else {
      for (const opId of playerIds.filter(id => id !== result.wolfId)) {
        scores.set(opId, (scores.get(opId) ?? 0) + scoring.loneWolfLossPerOpponent);
      }
    }
  } else if (result.partnerId) {
    const wolfAndPartner = [result.wolfId, result.partnerId];
    if (isWolfWin) {
      for (const id of wolfAndPartner) {
        scores.set(id, (scores.get(id) ?? 0) + scoring.wolfPartnerWin);
      }
    } else {
      for (const opId of playerIds.filter(id => !wolfAndPartner.includes(id))) {
        scores.set(opId, (scores.get(opId) ?? 0) + scoring.wolfPartnerLossPerOpponent);
      }
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============================================
  // SEO
  // ============================================
  app.get("/robots.txt", (_req, res) => {
    const appUrl = process.env.APP_URL ?? "";
    res.type("text/plain").send(
      `User-agent: *\nAllow: /\n${appUrl ? `Sitemap: ${appUrl}/sitemap.xml\n` : ""}`
    );
  });

  app.get("/sitemap.xml", (req, res) => {
    const appUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${appUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>`
    );
  });

  // ============================================
  // COURSE PROXY ROUTES (no auth needed)
  // ============================================
  app.get(api.courses.search.path, async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) return res.status(400).json({ message: "Search query too short" });
    if (!GOLF_API_KEY) return res.status(503).json({ message: "Golf Course API not configured" });

    try {
      const upstream = await fetch(
        `${GOLF_API_BASE}/search/?search_query=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Key ${GOLF_API_KEY}` } }
      );
      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      console.error("[courses] search error:", err);
      res.status(502).json({ message: "Failed to reach Golf Course API" });
    }
  });

  app.get(api.courses.get.path, async (req, res) => {
    const courseId = String(req.params.courseId);
    if (!GOLF_API_KEY) return res.status(503).json({ message: "Golf Course API not configured" });

    try {
      const upstream = await fetch(
        `${GOLF_API_BASE}/courses/${courseId}`,
        { headers: { Authorization: `Key ${GOLF_API_KEY}` } }
      );
      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      console.error("[courses] fetch error:", err);
      res.status(502).json({ message: "Failed to reach Golf Course API" });
    }
  });

  // ============================================
  // GAME ROUTES
  // ============================================

  app.post(api.games.create.path, createGameLimiter, async (_req, res) => {
    const { game, adminToken } = await storage.createGame();
    res.status(201).json({ ...game, adminToken });
  });

  app.get(api.games.get.path, async (req, res) => {
    const id = String(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    const players = await storage.getPlayers(id);
    const results = await storage.getHoleResults(id);
    res.json({ game, players, results });
  });

  // Set Course (scored mode only)
  app.post(api.games.setCourse.path, async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!await requireAdminToken(req, res, id)) return;
      const input = api.games.setCourse.input.parse(req.body);
      const game = await storage.getGame(id);
      if (!game) return res.status(404).json({ message: "Game not found" });
      const updated = await storage.updateGameCourse(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Generate Round Summary
  app.post(api.games.summary.path, summaryLimiter, async (req, res) => {
    const id = String(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    if (!await requireAdminToken(req, res, id)) return;
    const players = await storage.getPlayers(id);
    const results = await storage.getHoleResults(id);
    try {
      const summary = await generateRoundSummary(players, results, game);
      res.json({ summary });
    } catch (err) {
      console.error("Summary error:", err);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // Set Player Order
  app.post(api.games.setOrder.path, async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!await requireAdminToken(req, res, id)) return;
      const input = api.games.setOrder.input.parse(req.body);
      const game = await storage.getGame(id);
      if (!game) return res.status(404).json({ message: "Game not found" });
      const updated = await storage.updateGamePlayerOrder(id, input.playerOrder);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Start Game
  app.post(api.games.start.path, async (req, res) => {
    const id = String(req.params.id);
    if (!await requireAdminToken(req, res, id)) return;
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    const players = await storage.getPlayers(id);
    if (players.length < 3) return res.status(400).json({ message: "Need at least 3 players" });
    if (!game.playerOrder || game.playerOrder.length !== players.length) {
      return res.status(400).json({ message: "Set the tee-off order before starting" });
    }
    const updated = await storage.updateGameStatus(id, "playing");
    trackGameStarted(id, players.length);
    res.json(updated);
  });

  // Restart Game
  app.post(api.games.restart.path, async (req, res) => {
    const id = String(req.params.id);
    if (!await requireAdminToken(req, res, id)) return;
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    await storage.updateGameStatus(id, "setup");
    await storage.updateGameHole(id, 1);
    await storage.updateGamePlayerOrder(id, []);
    await storage.deleteAllHoleResults(id);
    await storage.resetPlayerScores(id);
    res.json(await storage.getGame(id));
  });

  // ============================================
  // PLAYER ROUTES
  // ============================================

  app.post(api.players.create.path, async (req, res) => {
    try {
      const gameId = String(req.params.gameId);
      if (!await requireAdminToken(req, res, gameId)) return;
      const input = api.players.create.input.parse(req.body);
      const player = await storage.createPlayer({ ...input, gameId });
      res.status(201).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete(api.players.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const player = await storage.getPlayer(id);
    if (!player) return res.status(404).json({ message: "Player not found" });
    if (!await requireAdminToken(req, res, player.gameId)) return;
    await storage.deletePlayer(id);
    res.status(204).send();
  });

  // ============================================
  // HOLE ROUTES
  // ============================================

  app.post(api.holes.submit.path, async (req, res) => {
    try {
      const gameId = String(req.params.gameId);
      if (!await requireAdminToken(req, res, gameId)) return;
      const input = api.holes.submit.input.parse(req.body);

      const players = await storage.getPlayers(gameId);
      const allPlayerIds = players.map(p => p.id);

      let { isDraw } = input;
      let winnerIds = input.winnerIds ?? [];

      if (input.netScores && Object.keys(input.netScores).length > 0) {
        // Scored mode: auto-calculate winners from net scores
        const calc = calculateWinnersFromNetScores(
          input.netScores,
          input.wolfId,
          input.partnerId,
          input.isLoneWolf,
          input.isBlindWolf,
          allPlayerIds
        );
        winnerIds = calc.winnerIds;
        isDraw = calc.isDraw;
      } else {
        // Simple mode: validate manually submitted winners
        if (!isDraw) {
          const wolfSideIds = (!input.isLoneWolf && !input.isBlindWolf && input.partnerId)
            ? [input.wolfId, input.partnerId]
            : [input.wolfId];
          const hunterIds = allPlayerIds.filter(id => !wolfSideIds.includes(id));

          if (wolfSideIds.length > 1) {
            const wolfWins = winnerIds.includes(input.wolfId);
            const partnerWins = winnerIds.includes(input.partnerId!);
            if (wolfWins !== partnerWins) {
              return res.status(400).json({ message: "Wolf and partner must win or lose together" });
            }
          }
          const huntersWinning = hunterIds.filter(id => winnerIds.includes(id));
          if (huntersWinning.length > 0 && huntersWinning.length !== hunterIds.length) {
            return res.status(400).json({ message: "Hunters win or lose as a team" });
          }
        }
      }

      const result = await storage.createHoleResult({
        ...input,
        gameId,
        winnerIds,
        isDraw,
        netScores: input.netScores ?? null,
      });
      await recalculateAllScores(gameId);

      const game = await storage.getGame(gameId);
      if (game) {
        if (input.holeNumber === 18) {
          await storage.updateGameStatus(gameId, "complete");
          trackGameEnded(gameId);
        } else {
          await storage.updateGameHole(gameId, input.holeNumber + 1);
        }
      }

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put(api.holes.edit.path, async (req, res) => {
    try {
      const gameId = String(req.params.gameId);
      if (!await requireAdminToken(req, res, gameId)) return;
      const holeNumber = Number(req.params.holeNumber);
      const input = api.holes.edit.input.parse(req.body);

      const players = await storage.getPlayers(gameId);
      const allPlayerIds = players.map(p => p.id);

      let { isDraw } = input;
      let winnerIds = input.winnerIds ?? [];

      if (input.netScores && Object.keys(input.netScores).length > 0) {
        const calc = calculateWinnersFromNetScores(
          input.netScores,
          input.wolfId,
          input.partnerId,
          input.isLoneWolf,
          input.isBlindWolf,
          allPlayerIds
        );
        winnerIds = calc.winnerIds;
        isDraw = calc.isDraw;
      } else {
        if (!isDraw) {
          const wolfSideIds = (!input.isLoneWolf && !input.isBlindWolf && input.partnerId)
            ? [input.wolfId, input.partnerId]
            : [input.wolfId];
          const hunterIds = allPlayerIds.filter(id => !wolfSideIds.includes(id));

          if (wolfSideIds.length > 1) {
            const wolfWins = winnerIds.includes(input.wolfId);
            const partnerWins = winnerIds.includes(input.partnerId!);
            if (wolfWins !== partnerWins) {
              return res.status(400).json({ message: "Wolf and partner must win or lose together" });
            }
          }
          const huntersWinning = hunterIds.filter(id => winnerIds.includes(id));
          if (huntersWinning.length > 0 && huntersWinning.length !== hunterIds.length) {
            return res.status(400).json({ message: "Hunters win or lose as a team" });
          }
        }
      }

      const result = await storage.upsertHoleResult({
        ...input,
        gameId,
        holeNumber,
        winnerIds,
        isDraw,
        netScores: input.netScores ?? null,
      });
      await recalculateAllScores(gameId);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  return httpServer;
}
