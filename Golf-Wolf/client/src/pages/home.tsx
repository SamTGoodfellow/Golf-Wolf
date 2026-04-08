import { useLocation } from "wouter";
import { useCreateGame } from "@/hooks/use-game";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Play } from "lucide-react";
import { Logo } from "@/components/logo";

const scoringRows = [
  { scenario: "Wolf + Partner Win", wolf: "+2", partner: "+2", hunters: "0", emoji: "🏆" },
  { scenario: "Wolf + Partner Lose", wolf: "0", partner: "0", hunters: "+3 ea", emoji: "💀" },
  { scenario: "Lone Wolf Wins", wolf: "+4", partner: "—", hunters: "0", emoji: "👑" },
  { scenario: "Lone Wolf Loses", wolf: "0", partner: "—", hunters: "+1 ea", emoji: "😬" },
  { scenario: "Blind Wolf Wins", wolf: "+6", partner: "—", hunters: "0", emoji: "🌑👑" },
  { scenario: "Blind Wolf Loses", wolf: "0", partner: "—", hunters: "+3 ea", emoji: "💸" },
  { scenario: "Draw", wolf: "0", partner: "0", hunters: "0", emoji: "🤝" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const createGame = useCreateGame();

  const handleStart = () => {
    createGame.mutate(undefined, {
      onSuccess: (game) => {
        setLocation(`/game/${game.id}/setup`);
      },
    });
  };

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
                Golf Wolf is a betting game where one player per hole is crowned <strong>The Wolf</strong>. The Wolf tees off last, watches everyone else swing, then decides whether to take a partner or go it alone against the pack.
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

            {/* Scoring table */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg px-1">Scoring</h3>
              <div className="bg-white/70 rounded-2xl overflow-hidden border border-white/40 shadow-sm">
                <div className="grid grid-cols-4 text-xs font-bold text-muted-foreground uppercase tracking-wide bg-muted/40 px-3 py-2">
                  <div className="col-span-1">Outcome</div>
                  <div className="text-center">Wolf</div>
                  <div className="text-center">Partner</div>
                  <div className="text-center">Hunters</div>
                </div>
                {scoringRows.map((row, i) => (
                  <div key={row.scenario} className={`grid grid-cols-4 px-3 py-2.5 text-sm items-center ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <div className="col-span-1 font-medium text-foreground text-xs leading-tight">
                      {row.emoji} {row.scenario}
                    </div>
                    <div className={`text-center font-bold ${row.wolf !== "0" && row.wolf !== "—" ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {row.wolf}
                    </div>
                    <div className={`text-center font-bold ${row.partner !== "0" && row.partner !== "—" ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {row.partner}
                    </div>
                    <div className={`text-center font-bold ${row.hunters !== "0" && row.hunters !== "—" ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {row.hunters}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
