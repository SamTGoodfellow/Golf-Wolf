import { type HoleResult, type Player } from "@shared/schema";
import { Pencil } from "lucide-react";

interface HoleHistoryProps {
  results: HoleResult[];
  players: Player[];
  onEdit: (result: HoleResult) => void;
}

function getHoleLabel(result: HoleResult): string {
  if (result.isDraw) return "Draw 🤝";
  if (result.isBlindWolf) return "Blind Wolf 🌑";
  if (result.isLoneWolf) return "Lone Wolf 👑";
  return "Wolf + Partner 🤝";
}

function getPlayerPoints(result: HoleResult, player: Player, allPlayerIds: number[]): number {
  if (result.isDraw) return 0;

  const winnerIds = result.winnerIds ?? [];
  const isWolfWin = winnerIds.includes(result.wolfId);
  const wolfAndPartner = result.partnerId
    ? [result.wolfId, result.partnerId]
    : [result.wolfId];

  if (result.isBlindWolf) {
    if (player.id === result.wolfId) return isWolfWin ? 6 : 0;
    return isWolfWin ? 0 : 3;
  }

  if (result.isLoneWolf) {
    if (player.id === result.wolfId) return isWolfWin ? 4 : 0;
    return isWolfWin ? 0 : 1;
  }

  // Wolf + Partner
  if (wolfAndPartner.includes(player.id)) {
    return isWolfWin ? 2 : 0;
  }
  // Hunter
  return isWolfWin ? 0 : 3;
}

function getPlayerRole(result: HoleResult, playerId: number): string {
  if (playerId === result.wolfId) {
    if (result.isBlindWolf) return "Blind 🌑";
    if (result.isLoneWolf) return "Lone 👑";
    return "Wolf 🐺";
  }
  if (playerId === result.partnerId) return "Partner 🤝";
  return "Hunter";
}

export function HoleHistory({ results, players, onEdit }: HoleHistoryProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      {results.map(result => {
        const wolf = players.find(p => p.id === result.wolfId);
        const winnerIds = result.winnerIds ?? [];
        const wolfWon = winnerIds.includes(result.wolfId);

        return (
          <div key={result.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Hole header */}
            <div className={`flex items-center justify-between px-4 py-2.5 ${
              result.isDraw
                ? 'bg-gray-50'
                : wolfWon
                  ? 'bg-green-50'
                  : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-3">
                <span className="font-display font-black text-2xl text-foreground leading-none">
                  {result.holeNumber}
                </span>
                <div>
                  <p className="font-bold text-sm text-foreground leading-tight">{getHoleLabel(result)}</p>
                  <p className="text-xs text-muted-foreground">{wolf?.name} was wolf</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!result.isDraw && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    wolfWon
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {wolfWon ? "Wolf wins" : "Hunters win"}
                  </span>
                )}
                <button
                  onClick={() => onEdit(result)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Per-player breakdown */}
            <div className="grid divide-x divide-border" style={{ gridTemplateColumns: `repeat(${players.length}, 1fr)` }}>
              {players.map(player => {
                const points = getPlayerPoints(result, player, players.map(p => p.id));
                const role = getPlayerRole(result, player.id);
                const isWinner = (result.winnerIds ?? []).includes(player.id) || result.isDraw;

                return (
                  <div key={player.id} className="p-2.5 text-center">
                    <p className="text-xs font-semibold text-muted-foreground truncate mb-1">{player.name}</p>
                    <p className="text-xs text-muted-foreground/60 mb-1.5">{role}</p>
                    <p className={`font-display font-bold text-lg leading-none ${
                      points > 0 ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                      {points > 0 ? `+${points}` : result.isDraw ? '—' : '0'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
