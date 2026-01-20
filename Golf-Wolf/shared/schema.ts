import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("setup"), // 'setup', 'playing', 'complete'
  currentHole: integer("current_hole").notNull().default(1),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  name: text("name").notNull(),
  handicap: integer("handicap").notNull().default(0),
  score: integer("score").notNull().default(0), // Cached total score for display
});

export const holeResults = pgTable("hole_results", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  holeNumber: integer("hole_number").notNull(),
  wolfId: integer("wolf_id").notNull(),
  partnerId: integer("partner_id"), // NULL if lone wolf
  isLoneWolf: boolean("is_lone_wolf").notNull().default(false),
  winnerIds: integer("winner_ids").array(), // IDs of players who won the hole
});

// === SCHEMAS ===
export const insertGameSchema = createInsertSchema(games).omit({ id: true, currentHole: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, score: true });
export const insertHoleResultSchema = createInsertSchema(holeResults).omit({ id: true });

// === EXPLICIT TYPES ===
export type Game = typeof games.$inferSelect;
export type Player = typeof players.$inferSelect;
export type HoleResult = typeof holeResults.$inferSelect;

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertHoleResult = z.infer<typeof insertHoleResultSchema>;

// Request types
export type CreatePlayerRequest = InsertPlayer;
export type SubmitHoleRequest = {
  holeNumber: number;
  wolfId: number;
  winnerIds: number[];
};

// Response types
export type GameStateResponse = {
  game: Game;
  players: Player[];
  results: HoleResult[];
};
