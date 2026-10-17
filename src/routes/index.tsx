import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings, Trophy, BarChart3, Mic2, Music, Vote, UserPlus, LogIn } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ryhämviisut" },
      { name: "description", content: "Ryhämviisujen kilpailut, tulokset, artistit ja musiikki." },
      { property: "og:title", content: "Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisujen kilpailut, tulokset, artistit ja musiikki." },
    ],
  }),
  component: Index,
});

const items = [
  { to: "/kilpailut", label: "Kilpailut", icon: Trophy },
  { to: "/tilastot", label: "Tilastot", icon: BarChart3 },
  { to: "/artistit", label: "Artistit", icon: Mic2 },
  { to: "/musiikki", label: "Musiikki", icon: Music },
  { to: "/aanesta", label: "Äänestä", icon: Vote },
  { to: "/osallistu", label: "Osallistu", icon: UserPlus },
] as const;

function Index() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
      <div className="flex justify-end gap-4">
        <Link to="/kirjaudu" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent">
          <LogIn className="h-5 w-5" /> Kirjaudu
        </Link>
        <Link to="/asetukset" aria-label="Asetukset" className="text-muted-foreground hover:text-accent">
          <Settings className="h-6 w-6" />
        </Link>
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-center text-7xl text-foreground md:text-9xl">
          Ryhäm<span className="text-primary">viisut</span>
        </h1>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="tile flex flex-col items-center gap-3 p-8">
              <Icon className="h-8 w-8 text-primary" />
              <span className="font-display text-3xl tracking-wide">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
