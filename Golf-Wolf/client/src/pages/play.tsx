import { useRoute, useLocation } from "wouter";
import { useGame, useRestartGame } from "@/hooks/use-game";
import { HoleScorer } from "@/components/hole-scorer";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Trophy, Activity } from "lucide-react";

export default function Play() {
  const [match, params] = useRoute("/game/:id");
  const [, setLocation] = useLocation();
  const gameId = params?.id ? parseInt(params.id) : null;
  const { data, isLoading, error } = useGame(gameId);
  const restartGame = useRestartGame();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-primary font-bold animate-pulse">Loading round...</div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center text-destructive">Game not found</div>;

  const { game, players, results } = data;

  // If in setup mode, redirect to setup
  if (game.status === "setup") {
    setLocation(`/game/${gameId}/setup`);
    return null;
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const isComplete = game.status === "complete";

  const handleRestart = () => {
    if (!gameId) return;
    if (confirm("Are you sure you want to restart? This will clear all scores.")) {
      restartGame.mutate(gameId);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              G
            </div>
            <span className="font-display font-bold text-lg">Golf Wolf</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRestart} className="text-muted-foreground hover:text-destructive">
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {isComplete ? (
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
            
            <Button 
              size="lg" 
              className="w-full mt-8 h-14 text-lg font-bold"
              onClick={handleRestart}
            >
              Start New Round
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="play" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 p-1 h-14 bg-white/50 backdrop-blur border border-white/20 shadow-sm rounded-2xl">
              <TabsTrigger value="play" className="rounded-xl text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-full transition-all">
                <Activity className="w-4 h-4 mr-2" /> Play Hole
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="rounded-xl text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md h-full transition-all">
                <Trophy className="w-4 h-4 mr-2" /> Leaderboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="play" className="mt-0 focus-visible:outline-none">
              <HoleScorer game={game} players={players} />
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-0 space-y-4 focus-visible:outline-none">
              {sortedPlayers.map((player, index) => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  rank={index + 1}
                  isWinner={index === 0 && game.currentHole > 1}
                />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
