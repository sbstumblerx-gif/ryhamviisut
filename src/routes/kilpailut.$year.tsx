import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/lib/admin";
import { SECTION_LABEL, SECTION_TYPES, yearQuery } from "@/lib/queries";

export const Route = createFileRoute("/kilpailut/$year")({
  head: ({ params }) => ({
    meta: [
      { title: `Ryhmäviisut ${params.year}` },
      { name: "description", content: `Ryhmäviisut ${params.year}: osiot ja tulokset.` },
      { property: "og:title", content: `Ryhmäviisut ${params.year}` },
      { property: "og:description", content: `Ryhmäviisut ${params.year}: osiot ja tulokset.` },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(yearQuery(Number(params.year))),
  component: YearPage,
});

function YearPage() {
  const { year } = Route.useParams();
  const { data } = useSuspenseQuery(yearQuery(Number(year)));
  const { isAdmin, run } = useAdmin();

  if (!data) return <PageShell title={year} back="/kilpailut"><p className="text-muted-foreground">Vuotta ei löytynyt.</p></PageShell>;

  const sections = SECTION_TYPES.map((t) => data.sections.find((s) => s.type === t)).filter((s) => !!s);
  const missing = SECTION_TYPES.filter((t) => !data.sections.some((s) => s.type === t));

  return (
    <PageShell title={`Ryhmäviisut ${year}`} back="/kilpailut">
      {isAdmin && missing.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {missing.map((t) => (
            <Button
              key={t}
              variant="secondary"
              onClick={() => run({ type: "addSection", competition_id: data.id, section: t }).catch((e) => toast.error(e.message))}
            >
              + {SECTION_LABEL[t]}
            </Button>
          ))}
        </div>
      )}
      {sections.length === 0 && <p className="text-muted-foreground">Ei vielä osioita.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <div key={s.id} className="relative">
            <Link to="/osio/$id" params={{ id: s.id }} className="tile block p-6">
              <span className="font-display text-4xl">{SECTION_LABEL[s.type]}</span>
            </Link>
            {isAdmin && (
              <button
                aria-label="Poista"
                className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
                onClick={() => confirm("Poistetaanko osio?") && run({ type: "deleteSection", id: s.id })}
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
