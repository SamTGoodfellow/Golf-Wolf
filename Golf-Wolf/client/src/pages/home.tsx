import { useLocation } from "wouter";
import { useCreateGame } from "@/hooks/use-game";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100 via-background to-background -z-10" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-12 text-center"
      >
        <div className="space-y-6">
          <Logo size="hero" />
          
          <div className="space-y-2">
            <h1 className="font-display font-black text-6xl tracking-tight text-foreground">
              Golf <span className="text-primary">Wolf</span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium max-w-xs mx-auto">
              The ultimate companion app for your Wolf golf games.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full h-16 text-xl font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
            onClick={handleStart}
            disabled={createGame.isPending}
          >
            {createGame.isPending ? (
              "Creating Course..."
            ) : (
              <span className="flex items-center gap-3">
                Start New Round <ArrowRight className="w-6 h-6" />
              </span>
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground/60 font-medium">
            No account required. Just play.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
