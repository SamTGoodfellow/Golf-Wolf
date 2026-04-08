import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGame, useCreatePlayer, useStartGame, useDeletePlayer, useSetPlayerOrder } from "@/hooks/use-game";
import { PlayerCard } from "@/components/player-card";
import { AddPlayerDialog } from "@/components/add-player-dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, ListOrdered } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function Setup() {
  const [match, params] = useRoute("/game/:id/setup");
  const [, setLocation] = useLocation();
  const gameId = params?.id ? parseInt(params.id) : null;
  const { data, isLoading, error } = useGame(gameId);
  const startGame = useStartGame();
  const deletePlayer = useDeletePlayer();
  const setPlayerOrder = useSetPlayerOrder();

  // Local ordered list of player IDs for the tee-off order step
  const [orderedPlayerIds, setOrderedPlayerIds] = useState<number[]>([]);

  // Sync orderedPlayerIds when players change (new player added, deleted, etc.)
  useEffect(() => {
    if (!data) return;
    const currentIds = data.players.map(p => p.id);
    setOrderedPlayerIds(prev => {
      // Keep existing order, add new players at end, remove deleted ones
      const kept = prev.filter(id => currentIds.includes(id));
      const added = currentIds.filter(id => !prev.includes(id));
      return [...kept, ...added];
    });
  }, [data?.players]);

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
  const orderedPlayers = orderedPlayerIds.map(id => players.find(p => p.id === id)).filter(Boolean) as typeof players;

  const movePlayer = (index: number, direction: -1 | 1) => {
    const newOrder = [...orderedPlayerIds];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setOrderedPlayerIds(newOrder);
  };

  const randomiseOrder = () => {
    const shuffled = [...orderedPlayerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrderedPlayerIds(shuffled);
  };

  const handleStartGame = async () => {
    if (!gameId) return;
    // Save order first, then start
    await setPlayerOrder.mutateAsync({ gameId, data: { playerOrder: orderedPlayerIds } });
    startGame.mutate(gameId, {
      onSuccess: () => setLocation(`/game/${gameId}`),
    });
  };

  return (
    <div className="min-h-screen">
      <PageHeader />
      <div className="pb-32 px-4 pt-8 max-w-lg mx-auto space-y-8">

        {/* Players */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h1 className="font-display font-bold text-4xl text-foreground">Player Setup</h1>
            <p className="text-muted-foreground text-lg">Add at least 3 players to start.</p>
          </div>

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

        {/* Tee-off Order — only show once 3+ players added */}
        {canStart && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <ListOrdered className="w-5 h-5 text-primary" />
                <span>Tee-Off Order</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={randomiseOrder}
                className="gap-2 font-semibold"
              >
                🎲 Randomise
              </Button>
            </div>

            <div className="space-y-2">
              {orderedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 bg-white rounded-xl p-3 border border-border shadow-sm"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="font-semibold flex-1 truncate">{player.name}</span>
                  {index === orderedPlayers.length - 1 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      🐺 Wolf hole 1
                    </span>
                  )}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      disabled={index === 0}
                      onClick={() => movePlayer(index, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed text-lg"
                    >
                      ↑
                    </button>
                    <button
                      disabled={index === orderedPlayers.length - 1}
                      onClick={() => movePlayer(index, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed text-lg"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center px-1">
              The last player is wolf on hole 1 — they always tee off last. Rotates each hole.
            </p>
          </div>
        )}

      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/25"
            disabled={!canStart || startGame.isPending || setPlayerOrder.isPending}
            onClick={handleStartGame}
          >
            {startGame.isPending || setPlayerOrder.isPending ? (
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
  );
}
