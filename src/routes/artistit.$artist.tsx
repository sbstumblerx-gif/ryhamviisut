import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { SECTION_LABEL } from "@/lib/queries";
import { artistDetailQuery } from "@/lib/queries";

export const Route = createFileRoute("/artistit/$artist")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.artist.replace(/-/g, " ")} – Ryhämviisut` },
      { name: "description", content: "Artistin kilpailuhistoria Ryhämviisuissa." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(artistDetailQuery(params.artist)),
  component: ArtistPage,
});

function ArtistPage() {
  const { artist } = Route.useParams();
  const { data } = useSuspenseQuery(artistDetailQuery(artist));

  if (!data.name) {
    return <PageShell title="Artistia ei löytynyt" back="/artistit"><p className="text-muted-foreground">Tätä artistia ei löytynyt.</p></PageShell>;
  }

  const sectionLabel = (type: string) =>
    SECTION_LABEL[type as keyof typeof SECTION_LABEL] ?? type;

  return (
    <PageShell title={data.name} back="/artistit">
      <h2 className="mb-4 text-2xl">Kilpailuhistoria</h2>
      {data.appearances.length === 0 ? (
        <p className="text-muted-foreground">Artistilla ei ole vielä kilpailumerkintöjä.</p>
      ) : (
        <ul className="space-y-3">
          {data.appearances
            .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
            .map((entry) => (
              <li key={entry.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-2xl text-accent">{entry.year ?? "Vuosi tuntematon"}</span>
                  <span className="text-sm text-muted-foreground">{sectionLabel(entry.sectionType)}</span>
                </div>
                {entry.song && <p className="mt-2 font-semibold">{entry.song}</p>}
                {entry.status === "eteni" && <p className="mt-1 text-sm text-success">Eteni finaaliin</p>}
                {entry.status === "karsiutui" && <p className="mt-1 text-sm text-destructive">Karsiutui</p>}
                <Link to="/osio/$id" params={{ id: entry.sectionId }} className="mt-3 inline-block text-sm text-primary hover:underline">
                  Avaa kilpailuosio →
                </Link>
              </li>
            ))}
        </ul>
      )}
    </PageShell>
  );
}
