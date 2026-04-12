import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { HoleResult } from "@shared/schema";

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

// Recalculate all player scores from scratch using every hole result.
// Called after any submit or edit to keep scores consistent.
async function recalculateAllScores(gameId: number): Promise<void> {
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
  if (result.isDraw) return; // Draw: no points change

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

  // Create Game
  app.post(api.games.create.path, async (req, res) => {
    const game = await storage.createGame();
    res.status(201).json(game);
  });

  // Get Game State
  app.get(api.games.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    const players = await storage.getPlayers(id);
    const results = await storage.getHoleResults(id);
    res.json({ game, players, results });
  });

  // Set Player Order
  app.post(api.games.setOrder.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.games.setOrder.input.parse(req.body);
      const game = await storage.getGame(id);
      if (!game) return res.status(404).json({ message: "Game not found" });
      const updated = await storage.updateGamePlayerOrder(id, input.playerOrder);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Start Game
  app.post(api.games.start.path, async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });

    const players = await storage.getPlayers(id);
    if (players.length < 3) {
      return res.status(400).json({ message: "Need at least 3 players" });
    }
    if (!game.playerOrder || game.playerOrder.length !== players.length) {
      return res.status(400).json({ message: "Set the tee-off order before starting" });
    }

    const updated = await storage.updateGameStatus(id, "playing");
    res.json(updated);
  });

  // Restart Game
  app.post(api.games.restart.path, async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });

    await storage.updateGameStatus(id, "setup");
    await storage.updateGameHole(id, 1);
    await storage.updateGamePlayerOrder(id, []);
    res.json(await storage.getGame(id));
  });

  // Add Player
  app.post(api.players.create.path, async (req, res) => {
    try {
      const gameId = Number(req.params.gameId);
      const input = api.players.create.input.parse(req.body);
      const player = await storage.createPlayer({ ...input, gameId });
      res.status(201).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Delete Player
  app.delete(api.players.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deletePlayer(id);
    res.status(204).send();
  });

  // Submit Hole Result
  app.post(api.holes.submit.path, async (req, res) => {
    try {
      const gameId = Number(req.params.gameId);
      const input = api.holes.submit.input.parse(req.body);

      if (!input.isDraw) {
        const players = await storage.getPlayers(gameId);
        const wolfSideIds = (!input.isLoneWolf && !input.isBlindWolf && input.partnerId)
          ? [input.wolfId, input.partnerId]
          : [input.wolfId];
        const hunterIds = players.map(p => p.id).filter(id => !wolfSideIds.includes(id));

        // Wolf and partner must win or lose together
        if (wolfSideIds.length > 1) {
          const wolfWins = input.winnerIds.includes(input.wolfId);
          const partnerWins = input.winnerIds.includes(input.partnerId!);
          if (wolfWins !== partnerWins) {
            return res.status(400).json({ message: "Wolf and partner must win or lose together" });
          }
        }

        // Hunters must all win or all lose — never split
        const huntersWinning = hunterIds.filter(id => input.winnerIds.includes(id));
        if (huntersWinning.length > 0 && huntersWinning.length !== hunterIds.length) {
          return res.status(400).json({ message: "Hunters win or lose as a team" });
        }
      }

      const result = await storage.createHoleResult({ ...input, gameId });
      await recalculateAllScores(gameId);

      const game = await storage.getGame(gameId);
      if (game) {
        if (input.holeNumber === 18) {
          await storage.updateGameStatus(gameId, "complete");
        } else {
          await storage.updateGameHole(gameId, input.holeNumber + 1);
        }
      }

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Edit Hole Result
  app.put(api.holes.edit.path, async (req, res) => {
    try {
      const gameId = Number(req.params.gameId);
      const holeNumber = Number(req.params.holeNumber);
      const input = api.holes.edit.input.parse(req.body);

      if (!input.isDraw) {
        const players = await storage.getPlayers(gameId);
        const wolfSideIds = (!input.isLoneWolf && !input.isBlindWolf && input.partnerId)
          ? [input.wolfId, input.partnerId]
          : [input.wolfId];
        const hunterIds = players.map(p => p.id).filter(id => !wolfSideIds.includes(id));

        if (wolfSideIds.length > 1) {
          const wolfWins = input.winnerIds.includes(input.wolfId);
          const partnerWins = input.winnerIds.includes(input.partnerId!);
          if (wolfWins !== partnerWins) {
            return res.status(400).json({ message: "Wolf and partner must win or lose together" });
          }
        }

        const huntersWinning = hunterIds.filter(id => input.winnerIds.includes(id));
        if (huntersWinning.length > 0 && huntersWinning.length !== hunterIds.length) {
          return res.status(400).json({ message: "Hunters win or lose as a team" });
        }
      }

      const result = await storage.upsertHoleResult({ ...input, gameId, holeNumber });
      await recalculateAllScores(gameId);

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  return httpServer;
}
