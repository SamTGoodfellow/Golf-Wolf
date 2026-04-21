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

  const handleRestart = () => {
    if (!gameId) return;
    if (confirm("Start a new round? This will clear all scores.")) {
      restartGame.mutate(gameId, {
        onSuccess: () => setLocation(`/game/${gameId}/setup`),
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <PageHeader />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-4 pt-8">
            <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-200 animate-bounce">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="font-display font-black text-5xl text-foreground">Round Complete!</h1>
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

          <div className="space-y-3 text-left">
            <h2 className="font-display font-bold text-2xl text-center">Hole by Hole</h2>
            <HoleHistory
              results={results}
              players={players}
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
