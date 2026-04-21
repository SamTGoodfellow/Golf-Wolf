import { randomUUID } from "crypto";
import {
  type Game, type Player, type HoleResult,
  type InsertPlayer, type InsertHoleResult
} from "@shared/schema";

export interface IStorage {
  // Game
  createGame(): Promise<{ game: Game; adminToken: string }>;
  getGame(id: string): Promise<Game | undefined>;
  getAdminToken(gameId: string): Promise<string | undefined>;
  updateGameStatus(id: string, status: string): Promise<Game>;
  updateGameHole(id: string, hole: number): Promise<Game>;
  updateGamePlayerOrder(id: string, playerOrder: number[]): Promise<Game>;
  updateGameCourse(id: string, data: {
    courseId: number;
    courseName: string;
    selectedTee: string;
    coursePar: number[];
    courseYardage: number[];
  }): Promise<Game>;

  // Players
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayers(gameId: string): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<void>;
  updatePlayerScore(id: number, newScore: number): Promise<Player>;
  resetPlayerScores(gameId: string): Promise<void>;

  // Hole Results
  createHoleResult(result: InsertHoleResult): Promise<HoleResult>;
  upsertHoleResult(result: InsertHoleResult): Promise<HoleResult>;
  getHoleResults(gameId: string): Promise<HoleResult[]>;
  getHoleResult(gameId: string, holeNumber: number): Promise<HoleResult | undefined>;
  deleteHoleResult(gameId: string, holeNumber: number): Promise<void>;
  deleteAllHoleResults(gameId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private games: Map<string, Game>;
  private gameTokens: Map<string, string>;
  private players: Map<number, Player>;
  private holeResults: Map<number, HoleResult>;
  private playerIdCounter = 1;
  private resultIdCounter = 1;

  constructor() {
    this.games = new Map();
    this.gameTokens = new Map();
    this.players = new Map();
    this.holeResults = new Map();
  }

  async createGame(): Promise<{ game: Game; adminToken: string }> {
    const id = randomUUID();
    const adminToken = randomUUID();
    const game: Game = {
      id,
      status: "setup",
      currentHole: 1,
      playerOrder: null,
      mode: "simple",
      courseId: null,
      courseName: null,
      selectedTee: null,
      coursePar: null,
      courseYardage: null,
    };
    this.games.set(id, game);
    this.gameTokens.set(id, adminToken);
    return { game, adminToken };
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getAdminToken(gameId: string): Promise<string | undefined> {
    return this.gameTokens.get(gameId);
  }

  async updateGameStatus(id: string, status: string): Promise<Game> {
    const game = this.games.get(id);
    if (!game) throw new Error("Game not found");
    const updated = { ...game, status };
    this.games.set(id, updated);
    return updated;
  }

  async updateGameHole(id: string, hole: number): Promise<Game> {
    const game = this.games.get(id);
    if (!game) throw new Error("Game not found");
    const updated = { ...game, currentHole: hole };
    this.games.set(id, updated);
    return updated;
  }

  async updateGamePlayerOrder(id: string, playerOrder: number[]): Promise<Game> {
    const game = this.games.get(id);
    if (!game) throw new Error("Game not found");
    const updated = { ...game, playerOrder };
    this.games.set(id, updated);
    return updated;
  }

  async updateGameCourse(id: string, data: {
    courseId: number;
    courseName: string;
    selectedTee: string;
    coursePar: number[];
    courseYardage: number[];
  }): Promise<Game> {
    const game = this.games.get(id);
    if (!game) throw new Error("Game not found");
    const updated = { ...game, mode: "scored", ...data };
    this.games.set(id, updated);
    return updated;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerIdCounter++;
    const player: Player = {
      id,
      score: 0,
      name: insertPlayer.name,
      gameId: insertPlayer.gameId,
      handicap: insertPlayer.handicap ?? 0,
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayers(gameId: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(p => p.gameId === gameId);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async deletePlayer(id: number): Promise<void> {
    this.players.delete(id);
  }

  async updatePlayerScore(id: number, newScore: number): Promise<Player> {
    const player = this.players.get(id);
    if (!player) throw new Error("Player not found");
    const updated = { ...player, score: newScore };
    this.players.set(id, updated);
    return updated;
  }

  async resetPlayerScores(gameId: string): Promise<void> {
    const players = await this.getPlayers(gameId);
    for (const player of players) {
      this.players.set(player.id, { ...player, score: 0 });
    }
  }

  async createHoleResult(insertResult: InsertHoleResult): Promise<HoleResult> {
    const id = this.resultIdCounter++;
    const result: HoleResult = {
      id,
      gameId: insertResult.gameId,
      holeNumber: insertResult.holeNumber,
      wolfId: insertResult.wolfId,
      partnerId: insertResult.partnerId ?? null,
      isLoneWolf: insertResult.isLoneWolf ?? false,
      isBlindWolf: insertResult.isBlindWolf ?? false,
      isDraw: insertResult.isDraw ?? false,
      winnerIds: insertResult.winnerIds ?? null,
      netScores: insertResult.netScores ?? null,
    };
    this.holeResults.set(id, result);
    return result;
  }

  async upsertHoleResult(insertResult: InsertHoleResult): Promise<HoleResult> {
    await this.deleteHoleResult(insertResult.gameId, insertResult.holeNumber);
    return this.createHoleResult(insertResult);
  }

  async getHoleResults(gameId: string): Promise<HoleResult[]> {
    return Array.from(this.holeResults.values())
      .filter(r => r.gameId === gameId)
      .sort((a, b) => a.holeNumber - b.holeNumber);
  }

  async getHoleResult(gameId: string, holeNumber: number): Promise<HoleResult | undefined> {
    return Array.from(this.holeResults.values()).find(
      r => r.gameId === gameId && r.holeNumber === holeNumber
    );
  }

  async deleteHoleResult(gameId: string, holeNumber: number): Promise<void> {
    const existing = await this.getHoleResult(gameId, holeNumber);
    if (existing) this.holeResults.delete(existing.id);
  }

  async deleteAllHoleResults(gameId: string): Promise<void> {
    const toDelete = Array.from(this.holeResults.entries())
      .filter(([, r]) => r.gameId === gameId)
      .map(([id]) => id);
    for (const id of toDelete) this.holeResults.delete(id);
  }
}

export const storage = new MemStorage();
