import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGame, useCreatePlayer, useStartGame, useDeletePlayer, useSetPlayerOrder } from "@/hooks/use-game";
import { PlayerCard } from "@/components/player-card";
import { AddPlayerDialog } from "@/components/add-player-dialog";
import { CourseSearch } from "@/components/course-search";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, ListOrdered, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type SetupStep = "mode" | "course" | "players";

export default function Setup() {
  const [match, params] = useRoute("/game/:id/setup");
  const [, setLocation] = useLocation();
  const gameId = params?.id ?? null;
  const { data, isLoading, error } = useGame(gameId);
  const startGame = useStartGame();
  const deletePlayer = useDeletePlayer();
  const setPlayerOrder = useSetPlayerOrder();

  const [step, setStep] = useState<SetupStep>("mode");

  // Once we know the game's mode, skip the mode-select step if course already set
  useEffect(() => {
    if (data?.game.mode === "scored") setStep("players");
  }, [data?.game.mode]);

  // Local ordered list of player IDs for the tee-off order step
  const [orderedPlayerIds, setOrderedPlayerIds] = useState<number[]>([]);

  // Sync orderedPlayerIds when players change (new player added, deleted, etc.)
  useEffect(() => {
    if (!data) return;
    const currentIds = data.players.map(p => p.id);
    setOrderedPlayerIds(prev => {
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

  const { game, players } = data;
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
    await setPlayerOrder.mutateAsync({ gameId, data: { playerOrder: orderedPlayerIds } });
    startGame.mutate(gameId, {
      onSuccess: () => setLocation(`/game/${gameId}`),
    });
  };

  // ── Step 1: Mode selection ──────────────────────────────────────────────────
  if (step === "mode") {
    return (
      <div className="min-h-screen">
        <PageHeader confirmLeave />
        <div className="px-4 pt-8 max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-display font-bold text-4xl text-foreground">Game Mode</h1>
            <p className="text-muted-foreground text-lg">How are you playing today?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setStep("players")}
              className="w-full bg-white border-2 border-border rounded-2xl p-5 text-left hover:border-primary/50 hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <LayoutGrid className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-foreground">Simple</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Pick who won each hole manually. No course data needed.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep("course")}
              className="w-full bg-white border-2 border-border rounded-2xl p-5 text-left hover:border-green-500/50 hover:bg-green-50/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                  <span className="text-2xl">⛳</span>
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-foreground">Scored</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Enter net scores per hole. App calculates winners automatically from handicap-adjusted scores.
                  </p>
                  <span className="inline-block mt-2 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Course data included
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Course search (scored mode) ─────────────────────────────────────
  if (step === "course") {
    return (
      <div className="min-h-screen">
        <PageHeader confirmLeave />
        <div className="px-4 pt-8 max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-display font-bold text-4xl text-foreground">Select Course</h1>
            <p className="text-muted-foreground text-lg">Find your course and tee.</p>
          </div>

          <CourseSearch gameId={gameId!} onComplete={() => setStep("players")} />

          <button
            onClick={() => setStep("mode")}
            className="text-sm text-muted-foreground underline w-full text-center pb-8"
          >
            Back to mode selection
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Players + tee-off order ─────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <PageHeader confirmLeave />
      <div className="pb-32 px-4 pt-8 max-w-lg mx-auto space-y-8">

        {/* Course badge (scored mode) */}
        {game.mode === "scored" && game.courseName && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="text-2xl">⛳</span>
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{game.courseName}</p>
              <p className="text-xs text-muted-foreground">{game.selectedTee} tee · Scored mode</p>
            </div>
            <button
              onClick={() => setStep("course")}
              className="text-xs text-green-700 underline flex-shrink-0 font-semibold"
            >
              Change
            </button>
          </div>
        )}

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
