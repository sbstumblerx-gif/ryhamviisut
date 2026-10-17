import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/lib/admin";
import { competitionsQuery } from "@/lib/queries";

export const Route = createFileRoute("/kilpailut/")({
  head: () => ({
    meta: [
      { title: "Kilpailut – Ryhämviisut" },
      { name: "description", content: "Kaikki Ryhämviisujen kilpailuvuodet." },
      { property: "og:title", content: "Kilpailut – Ryhämviisut" },
      { property: "og:description", content: "Kaikki Ryhämviisujen kilpailuvuodet." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(competitionsQuery),
  component: Competitions,
});

function Competitions() {
  const { data } = useSuspenseQuery(competitionsQuery);
  const { isAdmin, run } = useAdmin();
  const [year, setYear] = useState("");

  return (
    <PageShell title="Kilpailut">
      {isAdmin && (
        <form
          className="mb-6 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await run({ type: "addYear", year: Number(year) });
              setYear("");
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          <Input type="number" placeholder="Vuosi, esim. 2026" value={year} onChange={(e) => setYear(e.target.value)} className="max-w-48" />
          <Button type="submit" disabled={!year}>Lisää vuosi</Button>
        </form>
      )}
      {data.length === 0 && <p className="text-muted-foreground">Ei vielä kilpailuja.</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {data.map((c) => (
          <div key={c.id} className="relative">
            <Link to="/kilpailut/$year" params={{ year: String(c.year) }} className="tile block p-8 text-center">
              <span className="font-display text-6xl text-primary">{c.year}</span>
            </Link>
            {isAdmin && (
              <button
                aria-label="Poista"
                className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                onClick={() => confirm(`Poistetaanko ${c.year} kaikkine tietoineen?`) && run({ type: "deleteYear", id: c.id })}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
