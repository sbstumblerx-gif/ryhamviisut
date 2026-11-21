import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/lisaa")({
  head: () => ({ meta: [{ title: "Lisää – Ryhämviisut" }, { name: "description", content: "Lisää sisältöä ja tutustu RyhämWikiin." }] }),
  component: MorePage,
});

function MorePage() {
  return <PageShell title="Lisää">
    <Link to="/wiki" className="tile flex items-center gap-4 p-6">
      <BookOpen className="h-9 w-9 shrink-0 text-primary" />
      <div><h2 className="text-2xl font-semibold">RyhämWiki</h2><p className="text-sm text-muted-foreground">Tietoa, artikkeleita ja oppaita Ryhämviisuista.</p></div>
    </Link>
  </PageShell>;
}