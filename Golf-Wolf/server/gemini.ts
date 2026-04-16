import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Player, HoleResult } from "@shared/schema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function generateRoundSummary(
  players: Player[],
  results: HoleResult[]
): Promise<string> {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const standings = sorted
    .map((p, i) => `${i + 1}. ${p.name}: ${p.score} pts`)
    .join("\n");

  const moments: string[] = [];
  for (const r of results) {
    const wolf = playerMap.get(r.wolfId) ?? "Unknown";
    const winner = (r.winnerIds ?? []).map((id) => playerMap.get(id)).join(" & ");
    if (r.isBlindWolf) {
      moments.push(`Hole ${r.holeNumber}: ${wolf} declared Blind Wolf — ${winner ? `won (${winner})` : "lost"}`);
    } else if (r.isLoneWolf) {
      moments.push(`Hole ${r.holeNumber}: ${wolf} went Lone Wolf — ${winner ? `won (${winner})` : "lost"}`);
    } else if (r.isDraw) {
      moments.push(`Hole ${r.holeNumber}: draw, no points`);
    }
  }

  const prompt = `You are a sharp-tongued but affectionate golf commentator writing the post-round wrap-up for a game of Wolf golf. Write exactly 3–4 sentences. Be specific with player names. Celebrate the winner — genuine praise, maybe a little smug on their behalf. Absolutely rinse the player who came last — no mercy, but keep it fun. If anyone went Blind Wolf or Lone Wolf, call it out with drama. If the winner's margin was slim, question whether they really deserved it. Keep it punchy.

Final standings:
${standings}

Notable moments:
${moments.length > 0 ? moments.join("\n") : "No Lone Wolf or Blind Wolf plays this round."}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
