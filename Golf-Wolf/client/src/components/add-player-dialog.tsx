import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreatePlayer } from "@/hooks/use-game";

interface AddPlayerDialogProps {
  gameId: number;
}

export function AddPlayerDialog({ gameId }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("0");
  const createPlayer = useCreatePlayer();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    createPlayer.mutate(
      { 
        gameId, 
        data: { 
          name, 
          handicap: parseInt(handicap) || 0 
        } 
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setHandicap("0");
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 py-8 text-muted-foreground hover:bg-muted/50 hover:border-primary/50 hover:text-primary transition-all duration-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm">
            <Plus className="h-6 w-6" />
          </div>
          <span className="font-semibold">Add New Player</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-white/20">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-center">Add Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Player Name</Label>
            <Input
              id="name"
              placeholder="e.g. Tiger Woods"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-lg"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="handicap">Handicap</Label>
            <Input
              id="handicap"
              type="number"
              placeholder="0"
              value={handicap}
              onChange={(e) => setHandicap(e.target.value)}
              className="h-12 text-lg"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90"
            disabled={createPlayer.isPending || !name}
          >
            {createPlayer.isPending ? "Adding..." : "Add Player"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
