import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HelpCircle } from "lucide-react";

const rules = [
  {
    scenario: "Wolf + Partner Win 🏆",
    wolf: "+2",
    partner: "+2",
    hunters: "0",
    color: "bg-green-50 border-green-200",
  },
  {
    scenario: "Wolf + Partner Lose 💀",
    wolf: "0",
    partner: "0",
    hunters: "+3 each",
    color: "bg-red-50 border-red-200",
  },
  {
    scenario: "Lone Wolf Wins 👑",
    wolf: "+4",
    partner: "—",
    hunters: "0",
    color: "bg-blue-50 border-blue-200",
  },
  {
    scenario: "Lone Wolf Loses 😬",
    wolf: "0",
    partner: "—",
    hunters: "+1 each",
    color: "bg-orange-50 border-orange-200",
  },
  {
    scenario: "Blind Wolf Wins 🌑👑",
    wolf: "+6",
    partner: "—",
    hunters: "0",
    color: "bg-purple-50 border-purple-200",
  },
  {
    scenario: "Blind Wolf Loses 💸",
    wolf: "0",
    partner: "—",
    hunters: "+3 each",
    color: "bg-pink-50 border-pink-200",
  },
  {
    scenario: "Draw 🤝",
    wolf: "0",
    partner: "0",
    hunters: "0",
    color: "bg-gray-50 border-gray-200",
  },
];

export function ScoringRulesSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-2xl text-center">Scoring Rules 📋</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 pb-6">
          {rules.map(rule => (
            <div key={rule.scenario} className={`rounded-xl border p-3 ${rule.color}`}>
              <p className="font-bold text-sm mb-2">{rule.scenario}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Wolf</div>
                  <div className="font-bold text-base">{rule.wolf}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Partner</div>
                  <div className="font-bold text-base">{rule.partner}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Hunters</div>
                  <div className="font-bold text-base">{rule.hunters}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
