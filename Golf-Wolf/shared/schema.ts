import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const games = pgTable("games", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("setup"),       // 'setup' | 'playing' | 'complete'
  currentHole: integer("current_hole").notNull().default(1),
  playerOrder: integer("player_order").array(),
  mode: text("mode").notNull().default("simple"),           // 'simple' | 'scored'
  courseId: integer("course_id"),
  courseName: text("course_name"),
  selectedTee: text("selected_tee"),
  coursePar: integer("course_par").array(),                 // par per hole [1..18]
  courseYardage: integer("course_yardage").array(),         // yardage per hole [1..18]
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").notNull(),
  name: text("name").notNull(),
  handicap: integer("handicap").notNull().default(0),
  score: integer("score").notNull().default(0),
});

export const holeResults = pgTable("hole_results", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").notNull(),
  holeNumber: integer("hole_number").notNull(),
  wolfId: integer("wolf_id").notNull(),
  partnerId: integer("partner_id"),
  isLoneWolf: boolean("is_lone_wolf").notNull().default(false),
  isBlindWolf: boolean("is_blind_wolf").notNull().default(false),
  isDraw: boolean("is_draw").notNull().default(false),
  winnerIds: integer("winner_ids").array(),
  netScores: json("net_scores"),                            // Record<string, number> | null
});

export const gameAnalytics = pgTable("game_analytics", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").notNull().unique(),
  playerCount: integer("player_count"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

// === SCHEMAS ===
export const insertGameSchema = createInsertSchema(games).omit({ id: true, currentHole: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, score: true });
export const insertHoleResultSchema = createInsertSchema(holeResults)
  .omit({ id: true })
  .extend({ netScores: z.record(z.string(), z.number()).nullable().optional() });

// === EXPLICIT TYPES ===
export type Game = typeof games.$inferSelect;
export type Player = typeof players.$inferSelect;

// Override netScores from `unknown` to a proper type
type HoleResultRaw = typeof holeResults.$inferSelect;
export type HoleResult = Omit<HoleResultRaw, "netScores"> & {
  netScores: Record<string, number> | null;
};

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertHoleResult = z.infer<typeof insertHoleResultSchema>;

export type CreatePlayerRequest = InsertPlayer;

export type GameStateResponse = {
  game: Game;
  players: Player[];
  results: HoleResult[];
};
