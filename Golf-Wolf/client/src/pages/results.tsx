import { useRoute, useLocation } from "wouter";
import { useGame, useRestartGame, useGameSummary } from "@/hooks/use-game";
import { PlayerCard } from "@/components/player-card";
import { HoleHistory } from "@/components/hole-history";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export default function Results() {
  const [, params] = useRoute("/game/:id/results");
  const [, setLocation] = useLocation();
  const gameId = params?.id ?? null;
  const { data, isLoading, error } = useGame(gameId);
  const restartGame = useRestartGame();
  const { data: summaryData, isLoading: summaryLoading } = useGameSummary(gameId, !!gameId);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold animate-pulse">Loading results...</div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center text-destructive">Game not found</div>;

  const { game, players, results } = data;

  if (game.status !== "complete") {
    setLocation(game.status === "setup" ? `/game/${gameId}/setup` : `/game/${gameId}`);
    return null;
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const isScored = game.mode === "scored";

  const handleRestart = () => {
    if (!gameId) return;
    if (confirm("Start a new round? This will clear all scores.")) {
      restartGame.mutate(gameId, {
        onSuccess: () => setLocation(`/game/${gameId}/setup`),
      });
    }
  };

  const totalPar = isScored && game.coursePar ? game.coursePar.reduce((s, p) => s + p, 0) : null;
  const totalYards = isScored && game.courseYardage ? game.courseYardage.reduce((s, y) => s + y, 0) : null;

  return (
    <div className="min-h-screen bg-muted/20">
      <PageHeader confirmLeave />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-4 pt-8">
            <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-200 animate-bounce">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="font-display font-black text-5xl text-foreground">Round Complete!</h1>
            {isScored && game.courseName && (
              <p className="text-base text-muted-foreground">
                {game.courseName} · {game.selectedTee} tee
              </p>
            )}
            <p className="text-xl text-muted-foreground">Final Standings</p>
          </div>

          <div className="space-y-4 text-left">
            {sortedPlayers.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                rank={index + 1}
                isWinner={index === 0}
              />
            ))}
          </div>

          <div className="rounded-2xl bg-white/60 backdrop-blur border border-white/30 shadow-sm px-5 py-4 text-left space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">The Verdict</p>
            {summaryLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Consulting the commentator...</p>
            ) : summaryData?.summary ? (
              <p className="text-sm leading-relaxed text-foreground">{summaryData.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No verdict available.</p>
            )}
          </div>

          {/* Course scorecard */}
          {isScored && game.coursePar && game.courseYardage && (
            <div className="text-left space-y-3">
              <h2 className="font-display font-bold text-2xl text-center">Course Scorecard</h2>
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                {game.courseName && (
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="font-bold text-sm text-foreground">{game.courseName}</p>
                    <p className="text-xs text-muted-foreground">{game.selectedTee} tee</p>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground bg-muted/20 w-12">Hole</th>
                        {game.coursePar.slice(0, 9).map((_, i) => (
                          <th key={i} className="px-1.5 py-2 font-semibold text-muted-foreground text-center w-8 bg-muted/20">{i + 1}</th>
                        ))}
                        <th className="px-2 py-2 font-semibold text-muted-foreground text-center bg-muted/40">Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="px-3 py-2 font-semibold text-foreground bg-muted/10">Par</td>
                        {game.coursePar.slice(0, 9).map((p, i) => (
                          <td key={i} className="px-1.5 py-2 text-center text-foreground">{p}</td>
                        ))}
                        <td className="px-2 py-2 text-center font-bold text-foreground bg-muted/10">
                          {game.coursePar.slice(0, 9).reduce((s, p) => s + p, 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="px-3 py-2 font-semibold text-foreground bg-muted/10">Yds</td>
                        {game.courseYardage.slice(0, 9).map((y, i) => (
                          <td key={i} className="px-1.5 py-2 text-center text-muted-foreground">{y}</td>
                        ))}
                        <td className="px-2 py-2 text-center font-bold text-muted-foreground bg-muted/10">
                          {game.courseYardage.slice(0, 9).reduce((s, y) => s + y, 0).toLocaleString()}
                        </td>
                      </tr>

                      {/* Back 9 header row */}
                      <tr className="border-b border-border">
                        <td className="px-3 py-2 font-semibold text-muted-foreground bg-muted/20">Hole</td>
                        {game.coursePar.slice(9).map((_, i) => (
                          <td key={i} className="px-1.5 py-2 font-semibold text-muted-foreground text-center bg-muted/20">{i + 10}</td>
                        ))}
                        <td className="px-2 py-2 font-semibold text-muted-foreground text-center bg-muted/40">In</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="px-3 py-2 font-semibold text-foreground bg-muted/10">Par</td>
                        {game.coursePar.slice(9).map((p, i) => (
                          <td key={i} className="px-1.5 py-2 text-center text-foreground">{p}</td>
                        ))}
                        <td className="px-2 py-2 text-center font-bold text-foreground bg-muted/10">
                          {game.coursePar.slice(9).reduce((s, p) => s + p, 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold text-foreground bg-muted/10">Yds</td>
                        {game.courseYardage.slice(9).map((y, i) => (
                          <td key={i} className="px-1.5 py-2 text-center text-muted-foreground">{y}</td>
                        ))}
                        <td className="px-2 py-2 text-center font-bold text-muted-foreground bg-muted/10">
                          {game.courseYardage.slice(9).reduce((s, y) => s + y, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                    {totalPar !== null && totalYards !== null && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/30">
                          <td className="px-3 py-2 font-bold text-foreground" colSpan={10}>Total</td>
                          <td className="px-2 py-2 text-center font-black text-foreground">{totalPar} / {totalYards.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 text-left">
            <h2 className="font-display font-bold text-2xl text-center">Hole by Hole</h2>
            <HoleHistory
              results={results}
              players={players}
              game={game}
              onEdit={() => {}}
            />
          </div>

          <Button
            size="lg"
            className="w-full mt-4 h-14 text-lg font-bold"
            onClick={handleRestart}
          >
            Start New Round
          </Button>
        </div>
      </main>
    </div>
  );
}
