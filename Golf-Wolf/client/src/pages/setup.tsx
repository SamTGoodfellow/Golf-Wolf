import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGame, useCreatePlayer, useStartGame, useDeletePlayer } from "@/hooks/use-game";
import { PlayerCard } from "@/components/player-card";
import { AddPlayerDialog } from "@/components/add-player-dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function Setup() {
  const [match, params] = useRoute("/game/:id/setup");
  const [, setLocation] = useLocation();
  const gameId = params?.id ? parseInt(params.id) : null;
  const { data, isLoading, error } = useGame(gameId);
  const startGame = useStartGame();
  const deletePlayer = useDeletePlayer();

  // Redirect if game is already playing or complete
  useEffect(() => {
    if (data?.game.status === "playing" || data?.game.status === "complete") {
      setLocation(`/game/${gameId}`);
    }
  }, [data, gameId, setLocation]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-primary">Loading setup...</div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center text-destructive">Error loading game</div>;

  const { players } = data;
  const canStart = players.length >= 3;

  const handleStartGame = () => {
    if (!gameId) return;
    startGame.mutate(gameId, {
      onSuccess: () => setLocation(`/game/${gameId}`),
    });
  };

  return (
    <div className="min-h-screen pb-20 px-4 pt-8 max-w-lg mx-auto">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6 rotate-3">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl text-foreground">
            Player Setup
          </h1>
          <p className="text-muted-foreground text-lg">
            Add at least 3 players to start the round.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <Users className="w-5 h-5 text-primary" />
              <span>Players ({players.length})</span>
            </div>
          </div>

          <div className="space-y-3">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onDelete={() => deletePlayer.mutate({ id: player.id, gameId: gameId! })}
              />
            ))}
            
            <AddPlayerDialog gameId={gameId!} />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-border">
          <div className="max-w-lg mx-auto">
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/25"
              disabled={!canStart || startGame.isPending}
              onClick={handleStartGame}
            >
              {startGame.isPending ? (
                "Starting Round..."
              ) : (
                <span className="flex items-center gap-2">
                  Start Round <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
            {!canStart && (
              <p className="text-center mt-2 text-sm text-muted-foreground">
                Need {3 - players.length} more player{3 - players.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
