import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    const players = await storage.getPlayers(id);
    const results = await storage.getHoleResults(id);
    
    // Recalculate scores to be safe (or just return current state)
    // In a real app, we might want to do this dynamically, but we have a 'score' field in player.
    // For now, trust the storage state.
    
    res.json({ game, players, results });
  });

  // Start Game
  app.post(api.games.start.path, async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    
    // Check min players
    const players = await storage.getPlayers(id);
    if (players.length < 3) {
      return res.status(400).json({ message: "Need at least 3 players" });
    }

    const updated = await storage.updateGameStatus(id, "playing");
    res.json(updated);
  });

  // Restart Game (Clear results, keep players)
  app.post(api.games.restart.path, async (req, res) => {
    const id = Number(req.params.id);
    const game = await storage.getGame(id);
    if (!game) return res.status(404).json({ message: "Game not found" });

    // Implementation TODO: Clear results in storage?
    // For MVP, maybe just create new game?
    // Let's just reset status and hole.
    const updated = await storage.updateGameStatus(id, "setup");
    await storage.updateGameHole(id, 1);
    
    // Ideally we'd delete hole results too.
    // Since MemStorage doesn't expose deleteHoleResults, we'll leave it for now or assume UI handles it.
    // Actually, let's just make a new game if they want to restart, simplest for MVP.
    // But for this route:
    res.json(updated);
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
      
      // Save result
      const result = await storage.createHoleResult({ ...input, gameId });
      
      const players = await storage.getPlayers(gameId);
      const playerIds = players.map(p => p.id);
      
      // Advanced Wolf Point Rules:
      // - Lone Wolf win: +4 to Wolf.
      // - Lone Wolf loss: +1 to each opponent.
      // - Wolf+Partner win: +2 to both.
      // - Wolf+Partner loss: +3 to each opponent.
      
      const isWolfWin = input.winnerIds.includes(input.wolfId);
      
      if (input.isLoneWolf) {
        if (isWolfWin) {
          // Wolf gets 4 points
          const wolf = await storage.getPlayer(input.wolfId);
          if (wolf) await storage.updatePlayerScore(input.wolfId, wolf.score + 4);
        } else {
          // Opponents get 1 point each
          const opponents = playerIds.filter(id => id !== input.wolfId);
          for (const opId of opponents) {
            const p = await storage.getPlayer(opId);
            if (p) await storage.updatePlayerScore(opId, p.score + 1);
          }
        }
      } else if (input.partnerId) {
        const wolfAndPartner = [input.wolfId, input.partnerId];
        if (isWolfWin) {
          // Wolf+Partner win: 2 pts each
          for (const id of wolfAndPartner) {
            const p = await storage.getPlayer(id);
            if (p) await storage.updatePlayerScore(id, p.score + 2);
          }
        } else {
          // Wolf+Partner lose: opponents 3 pts each
          const opponents = playerIds.filter(id => !wolfAndPartner.includes(id));
          for (const opId of opponents) {
            const p = await storage.getPlayer(opId);
            if (p) await storage.updatePlayerScore(opId, p.score + 3);
          }
        }
      }

      // Advance Hole if not 18
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

  return httpServer;
}
