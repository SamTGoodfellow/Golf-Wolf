import { 
  type Game, type Player, type HoleResult,
  type InsertPlayer, type InsertHoleResult
} from "@shared/schema";

export interface IStorage {
  // Game
  createGame(): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  updateGameStatus(id: number, status: string): Promise<Game>;
  updateGameHole(id: number, hole: number): Promise<Game>;
  
  // Players
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayers(gameId: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<void>;
  updatePlayerScore(id: number, newScore: number): Promise<Player>;
  
  // Hole Results
  createHoleResult(result: InsertHoleResult): Promise<HoleResult>;
  getHoleResults(gameId: number): Promise<HoleResult[]>;
  getHoleResult(gameId: number, holeNumber: number): Promise<HoleResult | undefined>;
}

export class MemStorage implements IStorage {
  private games: Map<number, Game>;
  private players: Map<number, Player>;
  private holeResults: Map<number, HoleResult>;
  private gameIdCounter = 1;
  private playerIdCounter = 1;
  private resultIdCounter = 1;

  constructor() {
    this.games = new Map();
    this.players = new Map();
    this.holeResults = new Map();
  }

  // Game
  async createGame(): Promise<Game> {
    const id = this.gameIdCounter++;
    const game: Game = {
      id,
      status: "setup",
      currentHole: 1,
    };
    this.games.set(id, game);
    return game;
  }

  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async updateGameStatus(id: number, status: string): Promise<Game> {
    const game = this.games.get(id);
    if (!game) throw new Error("Game not found");
    const updated = { ...game, status };
    this.games.set(id, updated);
    return updated;
  }

  async updateGameHole(id: number, hole: number): Promise<Game> {
    const game = this.games.get(id);
    if (!game) throw new Error("Game not found");
    const updated = { ...game, currentHole: hole };
    this.games.set(id, updated);
    return updated;
  }

  // Players
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerIdCounter++;
    const player: Player = { 
      id, 
      score: 0,
      name: insertPlayer.name,
      gameId: insertPlayer.gameId,
      handicap: insertPlayer.handicap ?? 0
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayers(gameId: number): Promise<Player[]> {
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

  // Hole Results
  async createHoleResult(insertResult: InsertHoleResult): Promise<HoleResult> {
    const id = this.resultIdCounter++;
    const result: HoleResult = { 
      id,
      gameId: insertResult.gameId,
      wolfId: insertResult.wolfId,
      partnerId: insertResult.partnerId ?? null,
      isLoneWolf: insertResult.isLoneWolf ?? false,
      winnerIds: insertResult.winnerIds ?? null,
      holeNumber: insertResult.holeNumber
    };
    this.holeResults.set(id, result);
    return result;
  }

  async getHoleResults(gameId: number): Promise<HoleResult[]> {
    return Array.from(this.holeResults.values()).filter(r => r.gameId === gameId);
  }

  async getHoleResult(gameId: number, holeNumber: number): Promise<HoleResult | undefined> {
    return Array.from(this.holeResults.values()).find(
      r => r.gameId === gameId && r.holeNumber === holeNumber
    );
  }
}

export const storage = new MemStorage();
