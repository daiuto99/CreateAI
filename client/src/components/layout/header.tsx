import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-header-title">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground" data-testid="text-header-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            data-testid="button-mobile-menu"
          >
            <i className="fas fa-bars w-5 h-5"></i>
          </Button>
          {action}
        </div>
      </div>
    </header>
  );
}
