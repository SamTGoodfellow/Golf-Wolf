import { Logo } from "@/components/logo";

interface PageHeaderProps {
  actions?: React.ReactNode;
}

export function PageHeader({ actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
        <Logo size="compact" />
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
