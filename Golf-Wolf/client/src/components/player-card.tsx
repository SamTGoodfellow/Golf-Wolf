import { motion } from "framer-motion";
import { Crown, Trash2 } from "lucide-react";
import { type Player } from "@shared/schema";

interface PlayerCardProps {
  player: Player;
  onDelete?: () => void;
  rank?: number;
  isWolf?: boolean;
  isWinner?: boolean;
}

export function PlayerCard({ player, onDelete, rank, isWolf, isWinner }: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl p-4 transition-all duration-300
        ${isWinner ? 'bg-gradient-to-br from-yellow-100 to-amber-50 border-amber-200 shadow-amber-100' : 'bg-white border-border shadow-sm'}
        border shadow-lg
        ${isWolf ? 'ring-4 ring-primary/20' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {rank === 1 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-yellow-900 shadow-sm">
              <Crown className="h-5 w-5" />
            </div>
          )}
          {rank && rank > 1 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold text-sm">
              #{rank}
            </div>
          )}
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-lg leading-none">{player.name}</h3>
              {isWolf && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  🐺 Wolf
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">HCP: {player.handicap}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-2xl font-bold font-display tabular-nums tracking-tight">
              {player.score > 0 ? `+${player.score}` : player.score}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total</span>
          </div>
          
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 -mr-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Visual embellishment for winner */}
      {isWinner && (
        <div className="absolute -right-6 -top-6 h-16 w-16 bg-gradient-to-br from-yellow-400 to-amber-500 opacity-20 blur-2xl" />
      )}
    </motion.div>
  );
}
