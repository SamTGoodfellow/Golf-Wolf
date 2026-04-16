import Groq from "groq-sdk";
import type { Player, HoleResult } from "@shared/schema";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateRoundSummary(
  players: Player[],
  results: HoleResult[]
): Promise<string> {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const standings = sorted
    .map((p, i) => `${i + 1}. ${p.name}: ${p.score} pts (handicap ${p.handicap})`)
    .join("\n");

  const bandits = players.filter((p) => p.handicap >= 18).map((p) => p.name);

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

  const prompt = `You are a savage golf commentator with zero sympathy. Write exactly 3–4 sentences. Be specific with player names. Celebrate the winner like they're a legend — but if their margin was slim, make it clear they barely scraped it. For the player who came last: destroy them. Be genuinely ruthless — mock their decisions, question their ability, suggest they take up a different sport. If anyone went Blind Wolf or Lone Wolf, dramatise it — heroic if it worked, humiliating if it didn't. No softening, no consolation prizes.

Final standings:
${standings}

Notable moments:
${moments.length > 0 ? moments.join("\n") : "No Lone Wolf or Blind Wolf plays this round."}
${bandits.length > 0 ? `\nSuspected bandits (high handicap players who may be hiding their true ability): ${bandits.join(", ")}. If any of them won or performed well, call them out as bandits — question whether their handicap is legitimate.` : ""}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });

  return completion.choices[0].message.content ?? "";
}
