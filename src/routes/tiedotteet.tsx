import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AnnouncementBody } from "@/components/AnnouncementBody";
import { readAnnouncements } from "@/lib/announcements.functions";

export const Route = createFileRoute("/tiedotteet")({
  head: () => ({
    meta: [
      { title: "Tiedotteet – Ryhämviisut" },
      { name: "description", content: "Ryhämviisujen uutiset, tiedotteet ja tärkeät ilmoitukset." },
      { property: "og:title", content: "Tiedotteet – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisujen uutiset, tiedotteet ja tärkeät ilmoitukset." },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const load = useServerFn(readAnnouncements);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => load(),
  });

  return (
    <PageShell title="Tiedotteet">
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <Megaphone className="mt-1 h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground">Ryhämviisujen viralliset uutiset ja ilmoitukset löytyvät tältä sivulta.</p>
      </div>
      {isLoading ? (
        <p role="status" className="text-muted-foreground">Ladataan tiedotteita…</p>
      ) : error ? (
        <div className="space-y-3 rounded-xl border border-destructive/40 p-5">
          <p>Tiedotteiden lataaminen epäonnistui.</p>
          <button className="rounded-md border px-3 py-2 text-sm" onClick={() => void refetch()}>Yritä uudelleen</button>
        </div>
      ) : !data?.announcements.length ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Ei vielä tiedotteita</h2>
          <p className="mt-2 text-muted-foreground">Uudet ilmoitukset julkaistaan täällä.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {data.announcements.map((announcement) => (
            <article key={announcement.id} id={announcement.id} className="tile p-5 sm:p-7">
              <h2 className="mb-2 text-2xl font-semibold">{announcement.title}</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Päivitetty {new Date(announcement.updated_at ?? announcement.created_at).toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <AnnouncementBody content={announcement.content} images={data.images} />
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
