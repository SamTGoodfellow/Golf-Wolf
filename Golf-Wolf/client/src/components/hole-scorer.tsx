import { useState } from "react";
import { type Player, type Game } from "@shared/schema";
import { useSubmitHole } from "@/hooks/use-game";
import { Check, User, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface HoleScorerProps {
  game: Game;
  players: Player[];
}

export function HoleScorer({ game, players }: HoleScorerProps) {
  const [wolfId, setWolfId] = useState<number | null>(null);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [isLoneWolf, setIsLoneWolf] = useState(false);
  const [winnerIds, setWinnerIds] = useState<number[]>([]);
  const submitHole = useSubmitHole();

  const toggleWinner = (id: number) => {
    setWinnerIds((prev) => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const isValid = wolfId !== null && (isLoneWolf || partnerId !== null) && winnerIds.length > 0;

  const handleSubmit = () => {
    if (!wolfId || (!isLoneWolf && !partnerId) || winnerIds.length === 0) return;

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#a3e635', '#fcd34d']
    });

    submitHole.mutate({
      gameId: game.id,
      data: {
        holeNumber: game.currentHole,
        wolfId,
        partnerId: isLoneWolf ? null : partnerId,
        isLoneWolf,
        winnerIds
      }
    }, {
      onSuccess: () => {
        setWolfId(null);
        setPartnerId(null);
        setIsLoneWolf(false);
        setWinnerIds([]);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="glass-card rounded-2xl p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <h2 className="text-sm font-bold text-primary tracking-widest uppercase mb-1">Current Hole</h2>
        <div className="text-6xl font-display font-black text-foreground">
          {game.currentHole}
          <span className="text-2xl text-muted-foreground/40 font-bold ml-2">/ 18</span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Step 1: Select Wolf */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">1</div>
            <h3 className="font-display font-bold text-xl">Who is the Wolf? 🐺</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => {
                  setWolfId(player.id);
                  if (partnerId === player.id) setPartnerId(null);
                }}
                className={`
                  relative p-4 rounded-xl text-left transition-all duration-200 border-2
                  ${wolfId === player.id 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-[1.02]' 
                    : 'bg-white border-transparent hover:border-primary/20 text-foreground shadow-sm hover:bg-muted/30'}
                `}
              >
                <div className="font-bold text-lg leading-tight">{player.name}</div>
                {wolfId === player.id && (
                  <motion.div
                    layoutId="wolf-indicator"
                    className="absolute top-2 right-2"
                  >
                    <Check className="w-4 h-4" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Lone Wolf or Partner */}
        <AnimatePresence>
          {wolfId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 px-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">2</div>
                <h3 className="font-display font-bold text-xl">Lone Wolf or Partner?</h3>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    setIsLoneWolf(!isLoneWolf);
                    setPartnerId(null);
                  }}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between
                    ${isLoneWolf 
                      ? 'bg-blue-500 border-blue-500 text-white shadow-lg' 
                      : 'bg-white border-border text-foreground hover:border-blue-200'}
                  `}
                >
                  <span className="font-bold text-lg">Go Lone Wolf! 🐺👑</span>
                  {isLoneWolf && <Check className="w-5 h-5" />}
                </button>

                {!isLoneWolf && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-muted-foreground px-1 uppercase tracking-wider">Select Partner:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {players.filter(p => p.id !== wolfId).map((player) => (
                        <button
                          key={player.id}
                          onClick={() => setPartnerId(player.id)}
                          className={`
                            p-3 rounded-xl border-2 transition-all text-sm font-bold
                            ${partnerId === player.id 
                              ? 'bg-blue-400 border-blue-400 text-white' 
                              : 'bg-white border-border text-foreground hover:bg-muted/50'}
                          `}
                        >
                          {player.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Select Winners */}
        <AnimatePresence>
          {wolfId && (isLoneWolf || partnerId) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 px-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">3</div>
                <h3 className="font-display font-bold text-xl">Who won the hole? 🏆</h3>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {players.map((player) => {
                  const isSelected = winnerIds.includes(player.id);
                  const isWolf = wolfId === player.id;
                  const isPartner = partnerId === player.id;
                  
                  return (
                    <button
                      key={player.id}
                      onClick={() => toggleWinner(player.id)}
                      className={`
                        flex items-center justify-between p-4 rounded-xl transition-all duration-200 border
                        ${isSelected
                          ? 'bg-accent/10 border-accent text-foreground shadow-md'
                          : 'bg-white border-border text-muted-foreground hover:bg-muted/20'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          flex h-10 w-10 items-center justify-center rounded-full transition-colors
                          ${isSelected ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}
                        `}>
                          {isWolf ? <span className="text-lg">🐺</span> : isPartner ? <span className="text-lg">🤝</span> : <User className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                          <div className={`font-bold text-lg ${isSelected ? 'text-foreground' : ''}`}>
                            {player.name}
                          </div>
                          <div className="text-xs font-medium opacity-60">
                            {isWolf ? 'The Wolf' : isPartner ? 'Partner' : 'Hunter'}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${isSelected ? 'border-accent bg-accent text-white' : 'border-muted-foreground/30'}
                      `}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitHole.isPending}
            className={`
              w-full py-4 rounded-2xl font-display font-bold text-xl shadow-xl transition-all duration-300
              ${isValid 
                ? 'bg-gradient-to-r from-primary to-green-600 text-white shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1' 
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'}
            `}
          >
            {submitHole.isPending ? "Calculating..." : "Complete Hole"}
          </button>
          
          {!isValid && wolfId && (
            <p className="text-center mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {!isLoneWolf && !partnerId ? "Select a partner or go Lone Wolf" : "Select at least one winner"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
