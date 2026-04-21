import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGame, useRestartGame } from "@/hooks/use-game";
import { HoleScorer } from "@/components/hole-scorer";
import { PlayerCard } from "@/components/player-card";
import { HoleHistory } from "@/components/hole-history";
import { ScoringRulesSheet } from "@/components/scoring-rules-sheet";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Trophy, Activity } from "lucide-react";
import { type HoleResult } from "@shared/schema";

export default function Play() {
  const [, params] = useRoute("/game/:id");
  const [, setLocation] = useLocation();
  const gameId = params?.id ?? null;
  const { data, isLoading, error } = useGame(gameId);
  const restartGame = useRestartGame();

  const [editingResult, setEditingResult] = useState<HoleResult | null>(null);
  const [activeTab, setActiveTab] = useState("play");

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold animate-pulse">Loading round...</div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center text-destructive">Game not found</div>;

  const { game, players, results } = data;

  if (game.status === "setup") {
    setLocation(`/game/${gameId}/setup`);
    return null;
  }

  if (game.status === "complete") {
    setLocation(`/game/${gameId}/results`);
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
      <PageHeader
        confirmLeave
        actions={
          <>
            <ScoringRulesSheet playerCount={players.length} />
            <Button variant="ghost" size="icon" onClick={handleRestart} className="text-muted-foreground hover:text-destructive">
              <RotateCcw className="w-5 h-5" />
            </Button>
          </>
        }
      />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 p-1 h-14 bg-white/50 backdrop-blur border border-white/20 shadow-sm rounded-2xl">
            <TabsTrigger
              value="play"
              className="rounded-xl text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-full transition-all"
              onClick={() => { setEditingResult(null); setActiveTab("play"); }}
            >
              <Activity className="w-4 h-4 mr-2" /> Play Hole
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="rounded-xl text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-full transition-all"
            >
              <Trophy className="w-4 h-4 mr-2" /> Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="play" className="mt-0 focus-visible:outline-none">
            {editingResult ? (
              <HoleScorer
                game={game}
                players={players}
                editingResult={editingResult}
                onCancelEdit={() => setEditingResult(null)}
              />
            ) : (
              <HoleScorer game={game} players={players} />
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-0 space-y-6 focus-visible:outline-none">
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  rank={index + 1}
                  isWinner={index === 0 && game.currentHole > 1}
                />
              ))}
            </div>

            {results.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display font-bold text-xl px-1">Hole by Hole</h2>
                <HoleHistory
                  results={results}
                  players={players}
                  onEdit={(result) => {
                    setEditingResult(result);
                    setActiveTab("play");
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
