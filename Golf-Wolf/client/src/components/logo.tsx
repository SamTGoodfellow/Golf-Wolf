interface LogoProps {
  size?: "hero" | "compact";
}

export function Logo({ size = "compact" }: LogoProps) {
  if (size === "hero") {
    return (
      <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
        <div className="relative bg-gradient-to-br from-primary to-green-700 rounded-3xl w-24 h-24 flex items-center justify-center shadow-2xl shadow-primary/30 rotate-6">
          <span className="text-5xl">🐺</span>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-white p-2.5 rounded-full shadow-lg border border-border">
          <span className="text-lg leading-none">⛳</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex-shrink-0">
        <div className="h-9 w-9 bg-gradient-to-br from-primary to-green-700 rounded-xl flex items-center justify-center shadow-md rotate-3">
          <span className="text-xl leading-none">🐺</span>
        </div>
        <span className="absolute -bottom-1 -right-1 text-sm leading-none">⛳</span>
      </div>
      <span className="font-display font-bold text-lg leading-none">
        Golf <span className="text-primary">Wolf</span>
      </span>
    </div>
  );
}
