import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq } from "drizzle-orm";
import { gameAnalytics } from "@shared/schema";

type DB = ReturnType<typeof drizzle>;

let db: DB | null = null;

if (process.env.DATABASE_URL) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool);
}

export function trackGameStarted(gameId: string, playerCount: number): void {
  if (!db) return;
  db.insert(gameAnalytics)
    .values({ gameId, playerCount, startedAt: new Date() })
    .onConflictDoUpdate({
      target: gameAnalytics.gameId,
      set: { playerCount, startedAt: new Date() },
    })
    .catch(err => console.error("[analytics] trackGameStarted:", err));
}

export function trackGameEnded(gameId: string): void {
  if (!db) return;
  db.update(gameAnalytics)
    .set({ endedAt: new Date() })
    .where(eq(gameAnalytics.gameId, gameId))
    .catch(err => console.error("[analytics] trackGameEnded:", err));
}
