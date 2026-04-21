import { useLocation } from "wouter";
import { Logo } from "@/components/logo";

interface PageHeaderProps {
  actions?: React.ReactNode;
  confirmLeave?: boolean;
}

export function PageHeader({ actions, confirmLeave }: PageHeaderProps) {
  const [, setLocation] = useLocation();

  const handleLogoClick = () => {
    if (confirmLeave) {
      if (!confirm("Leave this game? You can return any time using the same link.")) return;
    }
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={handleLogoClick} className="cursor-pointer focus:outline-none">
          <Logo size="compact" />
        </button>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
