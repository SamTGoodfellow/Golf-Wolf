import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateGame } from "@/hooks/use-game";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Play, ChevronDown } from "lucide-react";
import { Logo } from "@/components/logo";

const scoringRows4P = [
  { scenario: "Partner", emoji: "🤝", wolfWin: "+2", wolfLose: "0", huntersWin: "0", huntersLose: "+3" },
  { scenario: "Lone Wolf", emoji: "👑", wolfWin: "+4", wolfLose: "0", huntersWin: "0", huntersLose: "+1" },
  { scenario: "Blind Wolf", emoji: "🌑", wolfWin: "+6", wolfLose: "0", huntersWin: "0", huntersLose: "+3" },
];

const scoringRows3P = [
  { scenario: "Partner", emoji: "🤝", wolfWin: "+2", wolfLose: "0", huntersWin: "0", huntersLose: "+3" },
  { scenario: "Lone Wolf", emoji: "👑", wolfWin: "+4", wolfLose: "0", huntersWin: "0", huntersLose: "+2" },
  { scenario: "Blind Wolf", emoji: "🌑", wolfWin: "+5", wolfLose: "0", huntersWin: "0", huntersLose: "+3" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const createGame = useCreateGame();
  const [scoringOpen, setScoringOpen] = useState(false);
  const [playerFilter, setPlayerFilter] = useState<"3" | "4">("4");

  const handleStart = () => {
    createGame.mutate(undefined, {
      onSuccess: (game) => {
        setLocation(`/game/${game.id}/setup`);
      },
    });
  };

  const scoringRows = playerFilter === "3" ? scoringRows3P : scoringRows4P;
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100 via-background to-background -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md pt-10 space-y-8"
      >
        {/* Hero logo */}
        <div className="text-center space-y-4">
          <Logo size="hero" />
          <div className="space-y-1">
            <h1 className="font-display font-black text-6xl tracking-tight text-foreground">
              Golf <span className="text-primary">Wolf</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-xs mx-auto">
              The ultimate companion for Wolf golf games.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="play" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 p-1 h-12 bg-white/60 backdrop-blur border border-white/30 shadow-sm rounded-2xl">
            <TabsTrigger value="play" className="rounded-xl font-semibold data-[state=active]:bg-primary data-[state=active]:text-white h-full transition-all">
              <Play className="w-4 h-4 mr-2" /> Play
            </TabsTrigger>
            <TabsTrigger value="how" className="rounded-xl font-semibold data-[state=active]:bg-primary data-[state=active]:text-white h-full transition-all">
              <BookOpen className="w-4 h-4 mr-2" /> How to Play
            </TabsTrigger>
          </TabsList>

          {/* Play tab */}
          <TabsContent value="play" className="mt-0 space-y-4 focus-visible:outline-none">
            <Button
              size="lg"
              className="w-full h-16 text-xl font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
              onClick={handleStart}
              disabled={createGame.isPending}
            >
              {createGame.isPending ? (
                "Setting up..."
              ) : (
                <span className="flex items-center gap-3">
                  Start New Round <ArrowRight className="w-6 h-6" />
                </span>
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground/60 font-medium">
              No account required. Just play.
            </p>
          </TabsContent>

          {/* How to Play tab */}
          <TabsContent value="how" className="mt-0 space-y-5 focus-visible:outline-none pb-8">
            {/* Jokey intro */}
            <div className="bg-white/70 backdrop-blur rounded-2xl p-5 border border-white/40 shadow-sm space-y-3">
              <h2 className="font-display font-bold text-xl">Right lads, listen up 🐺</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Golf Wolf is a betting game where one player per hole is <strong>The Wolf</strong>. Whoever racks up the most points by the end gets crowned the winner — try not to bottle it on the back nine.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The Wolf tees off last and watches each player hit. After every shot, they decide: <strong>pick that player as their partner</strong>, or pass and wait for the next one. Miss your window before the next player swings? That's gone — you can't go back. Once the Wolf steps up to tee, they either take whoever they last picked or go it alone.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Everyone plays their own ball throughout. The hole is won by whichever side posts the <strong>lowest net score</strong> — handicaps apply, so make sure you know your shots. The app tracks the Wolf points, not your arithmetic. You'll have to work the handicap strokes out yourselves lads, we're not miracle workers.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Think you've got the nerve to call <strong>Blind Wolf</strong> before anyone tees off? Be our guest mate — just don't cry about it at the 19th hole.
              </p>
            </div>

            {/* How it works */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg px-1">How it works</h3>
              <div className="space-y-2">
                {[
                  { icon: "1️⃣", text: "Set the tee-off order before you start. This decides who's Wolf on each hole." },
                  { icon: "🐺", text: "The Wolf tees off last every hole. Everyone else goes in order before them." },
                  { icon: "👀", text: "After each tee shot, the Wolf decides — pick that player as partner, or pass." },
                  { icon: "🤝", text: "Once the Wolf tees off, they must commit: take a partner or go Lone Wolf." },
                  { icon: "🌑", text: "Feeling lucky? Declare Blind Wolf before anyone tees. High risk, high reward." },
                ].map(({ icon, text }) => (
                  <div key={icon} className="flex gap-3 bg-white/60 rounded-xl p-3 border border-white/30">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring table — collapsible */}
            <Collapsible open={scoringOpen} onOpenChange={setScoringOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-1 py-1 group">
                  <h3 className="font-display font-bold text-lg">Scoring</h3>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${scoringOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3 pt-1">
                {/* 3P / 4P toggle */}
                <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
                  <button
                    onClick={() => setPlayerFilter("3")}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      playerFilter === "3"
                        ? "bg-white shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    3 Players
                  </button>
                  <button
                    onClick={() => setPlayerFilter("4")}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      playerFilter === "4"
                        ? "bg-white shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    4 Players
                  </button>
                </div>

                <div className="bg-white/70 rounded-2xl overflow-hidden border border-white/40 shadow-sm">
                  {/* Header */}
                  <div className="grid grid-cols-3 text-xs font-bold text-muted-foreground uppercase tracking-wide bg-muted/40 px-3 py-2">
                    <div>Scenario</div>
                    <div className="text-center">Wolf Team</div>
                    <div className="text-center">Hunters</div>
                  </div>

                  {/* Scenario rows */}
                  {scoringRows.map((row, i) => (
                    <div key={row.scenario} className={`grid grid-cols-3 px-3 py-2.5 items-center border-t border-border/20 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                      <div className="text-sm font-semibold text-foreground leading-tight">
                        {row.emoji} {row.scenario}
                      </div>
                      <div className="text-center space-y-0.5">
                        <div className="text-xs font-bold text-green-600">Win {row.wolfWin}</div>
                        <div className="text-xs font-medium text-muted-foreground">Lose {row.wolfLose}</div>
                      </div>
                      <div className="text-center space-y-0.5">
                        <div className="text-xs font-medium text-muted-foreground">Win {row.huntersWin}</div>
                        <div className="text-xs font-bold text-green-600">Lose {row.huntersLose}</div>
                      </div>
                    </div>
                  ))}

                  {/* Draw row */}
                  <div className="px-3 py-2.5 border-t border-border/20 bg-muted/10">
                    <div className="text-center text-xs text-muted-foreground font-medium">🤝 Draw — no points awarded</div>
                  </div>
                </div>

                {playerFilter === "4" && (
                  <p className="text-xs text-center text-muted-foreground px-1">
                    Holes 17 & 18: lowest scorer becomes Wolf 🐺
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
