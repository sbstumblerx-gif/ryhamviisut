import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Settings } from "lucide-react";

export function PageShell({ title, children, back = "/" }: { title: string; children: ReactNode; back?: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link to={back} className="text-sm text-muted-foreground hover:text-accent">
          ← Takaisin
        </Link>
        <Link to="/asetukset" aria-label="Asetukset" className="text-muted-foreground hover:text-accent">
          <Settings className="h-5 w-5" />
        </Link>
      </header>
      <h1 className="mb-6 text-5xl text-accent">{title}</h1>
      {children}
    </div>
  );
}

export function ComingSoon() {
  return <p className="text-muted-foreground">Tämä sivu on tulossa pian.</p>;
}
