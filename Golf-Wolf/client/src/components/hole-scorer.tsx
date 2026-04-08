import { useState } from "react";
import { type Player, type Game, type HoleResult } from "@shared/schema";
import { useSubmitHole, useEditHole } from "@/hooks/use-game";
import { getWolfId, getTeeOffOrder } from "@shared/routes";
import { Check, AlertCircle, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface HoleScorerProps {
  game: Game;
  players: Player[];
  /** Called when user wants to exit edit mode */
  onCancelEdit?: () => void;
  /** If set, we are editing an existing hole result */
  editingResult?: HoleResult;
}

type WolfDecision = "partner" | "lone" | "blind";

function buildInitialState(result: HoleResult | undefined): {
  decision: WolfDecision | null;
  partnerId: number | null;
  winnerIds: number[];
  isDraw: boolean;
} {
  if (!result) return { decision: null, partnerId: null, winnerIds: [], isDraw: false };

  let decision: WolfDecision | null = null;
  if (result.isBlindWolf) decision = "blind";
  else if (result.isLoneWolf) decision = "lone";
  else if (result.partnerId) decision = "partner";

  return {
    decision,
    partnerId: result.partnerId ?? null,
    winnerIds: result.winnerIds ?? [],
    isDraw: result.isDraw ?? false,
  };
}

export function HoleScorer({ game, players, editingResult, onCancelEdit }: HoleScorerProps) {
  const isEditing = !!editingResult;
  const holeNumber = isEditing ? editingResult!.holeNumber : game.currentHole;
  const playerOrder = game.playerOrder ?? players.map(p => p.id);

  const wolfId = getWolfId(playerOrder, holeNumber);
  const teeOffOrder = getTeeOffOrder(playerOrder, holeNumber);

  const initial = buildInitialState(editingResult);
  const [decision, setDecision] = useState<WolfDecision | null>(initial.decision);
  const [partnerId, setPartnerId] = useState<number | null>(initial.partnerId);
  const [winnerIds, setWinnerIds] = useState<number[]>(initial.winnerIds);
  const [isDraw, setIsDraw] = useState(initial.isDraw);

  const submitHole = useSubmitHole();
  const editHole = useEditHole();

  const wolf = players.find(p => p.id === wolfId);

  const toggleWinner = (id: number) => {
    if (isDraw) return;
    setWinnerIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  // Wolf+partner must win/lose together
  const handleToggleWinner = (id: number) => {
    if (decision === "partner" && partnerId) {
      const isWolf = id === wolfId;
      const isPartner = id === partnerId;
      if (isWolf || isPartner) {
        // Toggle both together
        const bothSelected = winnerIds.includes(wolfId) && winnerIds.includes(partnerId);
        if (bothSelected) {
          setWinnerIds(prev => prev.filter(pid => pid !== wolfId && pid !== partnerId));
        } else {
          setWinnerIds(prev => {
            const without = prev.filter(pid => pid !== wolfId && pid !== partnerId);
            return [...without, wolfId, partnerId];
          });
        }
        return;
      }
    }
    toggleWinner(id);
  };

  const handleDecision = (d: WolfDecision) => {
    setDecision(d);
    setPartnerId(null);
    setWinnerIds([]);
    setIsDraw(false);
  };

  const handleDraw = () => {
    setIsDraw(true);
    setWinnerIds([]);
  };

  const handleUndoDraw = () => {
    setIsDraw(false);
  };

  const isValid = isDraw
    ? decision !== null && (decision !== "partner" || partnerId !== null)
    : decision !== null &&
      (decision !== "partner" || partnerId !== null) &&
      winnerIds.length > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    const payload = {
      holeNumber,
      wolfId,
      partnerId: decision === "partner" ? partnerId : null,
      isLoneWolf: decision === "lone",
      isBlindWolf: decision === "blind",
      isDraw,
      winnerIds,
    };

    if (!isDraw) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#a3e635', '#fcd34d']
      });
    }

    if (isEditing) {
      editHole.mutate(
        { gameId: game.id, holeNumber, data: payload },
        { onSuccess: () => onCancelEdit?.() }
      );
    } else {
      submitHole.mutate(
        { gameId: game.id, data: payload },
        {
          onSuccess: () => {
            setDecision(null);
            setPartnerId(null);
            setWinnerIds([]);
            setIsDraw(false);
          }
        }
      );
    }
  };

  const isPending = submitHole.isPending || editHole.isPending;

  const getPlayerRole = (id: number) => {
    if (id === wolfId) return decision === "blind" ? "Blind Wolf 🐺" : "The Wolf 🐺";
    if (decision === "partner" && id === partnerId) return "Partner 🤝";
    return "Hunter";
  };

  return (
    <div className="space-y-6">
      {isEditing && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Pencil className="w-4 h-4" />
            Editing Hole {holeNumber}
          </div>
          <button onClick={onCancelEdit} className="text-sm text-amber-600 font-medium underline">
            Cancel
          </button>
        </div>
      )}

      {/* Hole header */}
      <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-primary tracking-widest uppercase">Hole</p>
            <div className="text-5xl font-display font-black text-foreground leading-none">
              {holeNumber}
              <span className="text-xl text-muted-foreground/40 font-bold ml-1.5">/ 18</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase mb-1">Wolf</p>
            <div className="flex items-center gap-2 justify-end">
              <span className="font-display font-bold text-xl text-foreground">{wolf?.name}</span>
              <span className="text-2xl">🐺</span>
            </div>
          </div>
        </div>

        {/* Tee-off order */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase mb-2">Tee-Off Order</p>
          <div className="flex items-center gap-2 flex-wrap">
            {teeOffOrder.map((playerId, idx) => {
              const player = players.find(p => p.id === playerId);
              const isWolf = playerId === wolfId;
              return (
                <div key={playerId} className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                    isWolf
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted text-foreground'
                  }`}>
                    <span className="opacity-60 text-xs">{idx + 1}.</span>
                    {player?.name}
                    {isWolf && <span className="text-base">🐺</span>}
                  </div>
                  {idx < teeOffOrder.length - 1 && (
                    <span className="text-muted-foreground/40 text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wolf's decision */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">1</div>
          <h3 className="font-display font-bold text-xl">{wolf?.name}'s call</h3>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {/* Blind Wolf — most exciting, top */}
          <button
            onClick={() => handleDecision("blind")}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between
              ${decision === "blind"
                ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200'
                : 'bg-white border-border text-foreground hover:border-purple-300'}`}
          >
            <div className="text-left">
              <div className="font-bold text-lg">Blind Wolf 🐺🌑</div>
              <div className={`text-xs mt-0.5 ${decision === "blind" ? 'text-purple-100' : 'text-muted-foreground'}`}>
                Declared before anyone tees off · Win +6 · Loss −3 each
              </div>
            </div>
            {decision === "blind" && <Check className="w-5 h-5 flex-shrink-0" />}
          </button>

          {/* Lone Wolf */}
          <button
            onClick={() => handleDecision("lone")}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between
              ${decision === "lone"
                ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200'
                : 'bg-white border-border text-foreground hover:border-blue-300'}`}
          >
            <div className="text-left">
              <div className="font-bold text-lg">Lone Wolf 🐺👑</div>
              <div className={`text-xs mt-0.5 ${decision === "lone" ? 'text-blue-100' : 'text-muted-foreground'}`}>
                Wolf vs everyone · Win +4 · Loss −1 each
              </div>
            </div>
            {decision === "lone" && <Check className="w-5 h-5 flex-shrink-0" />}
          </button>

          {/* Pick partner */}
          <button
            onClick={() => handleDecision("partner")}
            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between
              ${decision === "partner"
                ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200'
                : 'bg-white border-border text-foreground hover:border-green-300'}`}
          >
            <div className="text-left">
              <div className="font-bold text-lg">Pick a Partner 🤝</div>
              <div className={`text-xs mt-0.5 ${decision === "partner" ? 'text-green-100' : 'text-muted-foreground'}`}>
                2v2 · Win +2 each · Loss −3 each
              </div>
            </div>
            {decision === "partner" && <Check className="w-5 h-5 flex-shrink-0" />}
          </button>
        </div>
      </div>

      {/* Partner selection */}
      <AnimatePresence>
        {decision === "partner" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 px-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">2</div>
              <h3 className="font-display font-bold text-xl">Who's the partner?</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {players.filter(p => p.id !== wolfId).map(player => (
                <button
                  key={player.id}
                  onClick={() => setPartnerId(player.id)}
                  className={`p-3 rounded-xl border-2 transition-all font-bold
                    ${partnerId === player.id
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-border text-foreground hover:bg-muted/50'}`}
                >
                  {player.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Who won / Draw */}
      <AnimatePresence>
        {decision !== null && (decision !== "partner" || partnerId !== null) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                  {decision === "partner" ? "3" : "2"}
                </div>
                <h3 className="font-display font-bold text-xl">
                  {isDraw ? "It's a draw! 🤝" : "Who won the hole? 🏆"}
                </h3>
              </div>
              {!isDraw ? (
                <button
                  onClick={handleDraw}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1 hover:bg-muted/50 transition-colors"
                >
                  Draw
                </button>
              ) : (
                <button
                  onClick={handleUndoDraw}
                  className="text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition-colors"
                >
                  Undo draw
                </button>
              )}
            </div>

            {!isDraw && decision === "partner" && partnerId ? (
              // Partner mode: wolf+partner as one grouped frame, hunters individually
              <div className="space-y-2">
                {/* Wolf + Partner team block */}
                {(() => {
                  const teamSelected = winnerIds.includes(wolfId) && winnerIds.includes(partnerId);
                  const partnerPlayer = players.find(p => p.id === partnerId);
                  return (
                    <button
                      onClick={() => handleToggleWinner(wolfId)}
                      className={`w-full rounded-xl border-2 transition-all duration-200 overflow-hidden
                        ${teamSelected
                          ? 'border-accent bg-accent/10 shadow-md'
                          : 'border-border bg-white hover:bg-muted/20'}`}
                    >
                      <div className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-center
                        ${teamSelected ? 'bg-accent text-white' : 'bg-muted/40 text-muted-foreground'}`}>
                        🐺 Wolf &amp; Partner
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-border/50 p-3 gap-0">
                        {[
                          { player: wolf, role: "The Wolf 🐺" },
                          { player: partnerPlayer, role: "Partner 🤝" },
                        ].map(({ player, role }) => (
                          <div key={player?.id} className="flex items-center gap-2.5 px-2">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0
                              ${teamSelected ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}`}>
                              <span className="text-base">{role.includes('Wolf') ? '🐺' : '🤝'}</span>
                            </div>
                            <div className="text-left min-w-0">
                              <div className={`font-bold truncate ${teamSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {player?.name}
                              </div>
                              <div className="text-xs opacity-60">{role}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 pb-2.5 flex justify-end">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                          ${teamSelected ? 'border-accent bg-accent text-white' : 'border-muted-foreground/30'}`}>
                          {teamSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>
                  );
                })()}

                {/* Hunters individually */}
                {players
                  .filter(p => p.id !== wolfId && p.id !== partnerId)
                  .map(player => {
                    const isSelected = winnerIds.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => handleToggleWinner(player.id)}
                        className={`flex items-center justify-between w-full p-4 rounded-xl transition-all duration-200 border
                          ${isSelected
                            ? 'bg-accent/10 border-accent text-foreground shadow-md'
                            : 'bg-white border-border text-muted-foreground hover:bg-muted/20'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full
                            ${isSelected ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}`}>
                            <span className="text-lg">🏌️</span>
                          </div>
                          <div className="text-left">
                            <div className={`font-bold text-lg ${isSelected ? 'text-foreground' : ''}`}>{player.name}</div>
                            <div className="text-xs font-medium opacity-60">Hunter</div>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'border-accent bg-accent text-white' : 'border-muted-foreground/30'}`}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    );
                  })}
              </div>
            ) : !isDraw ? (
              // Lone wolf / blind wolf: individual cards for all players
              <div className="grid grid-cols-1 gap-2">
                {players.map(player => {
                  const isSelected = winnerIds.includes(player.id);
                  const role = getPlayerRole(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleToggleWinner(player.id)}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 border
                        ${isSelected
                          ? 'bg-accent/10 border-accent text-foreground shadow-md'
                          : 'bg-white border-border text-muted-foreground hover:bg-muted/20'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors
                          ${isSelected ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}`}>
                          {player.id === wolfId ? <span className="text-lg">🐺</span> : <span className="text-lg">🏌️</span>}
                        </div>
                        <div className="text-left">
                          <div className={`font-bold text-lg ${isSelected ? 'text-foreground' : ''}`}>{player.name}</div>
                          <div className="text-xs font-medium opacity-60">{role}</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0
                        ${isSelected ? 'border-accent bg-accent text-white' : 'border-muted-foreground/30'}`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {isDraw && (
              <div className="bg-muted/40 rounded-xl p-4 text-center text-muted-foreground font-medium">
                No points awarded for this hole.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <div className="pt-2 pb-8">
        <button
          onClick={handleSubmit}
          disabled={!isValid || isPending}
          className={`w-full py-4 rounded-2xl font-display font-bold text-xl shadow-xl transition-all duration-300
            ${isValid
              ? 'bg-gradient-to-r from-primary to-green-600 text-white shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'}`}
        >
          {isPending
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : isDraw
                ? "Record Draw"
                : "Complete Hole"}
        </button>

        {!isValid && decision !== null && (
          <p className="text-center mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {decision === "partner" && !partnerId
              ? "Pick a partner first"
              : "Select who won the hole"}
          </p>
        )}
      </div>
    </div>
  );
}
