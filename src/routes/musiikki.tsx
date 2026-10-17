import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ExternalLink, ListMusic, Play, Youtube } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ArtistLink } from "@/components/ArtistLink";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin, youtubeEmbed } from "@/lib/admin";
import { playMusicTrack } from "@/components/MusicPlayer";

export const Route = createFileRoute("/musiikki")({
  head: () => ({
    meta: [
      { title: "Musiikki – Ryhämviisut" },
      { name: "description", content: "Kuuntele Ryhämviisujen kappaleita ja musiikkivideoita." },
      { property: "og:title", content: "Musiikki – Ryhämviisut" },
      { property: "og:description", content: "Kuuntele Ryhämviisujen kappaleita ja musiikkivideoita." },
    ],
  }),
  component: MusicPage,
});

type MusicEntry = {
  id: string;
  artist: string;
  song: string | null;
  video_url: string | null;
  created_at: string;
  section_id: string;
  section: { type: string; competitions: { year: number } | null } | null;
};

function MusicPage() {
  const admin = useAdmin();
  const [filter, setFilter] = useState("");
  const { data: songs, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["music-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("id, artist, song, video_url, created_at, section_id, sections(type, competitions(year))");
      if (error) throw error;
      return ((data ?? []) as unknown as MusicEntry[])
        .filter((entry) => entry.song?.trim())
        .sort((a, b) => {
          const yearDiff = (b.section?.competitions?.year ?? 0) - (a.section?.competitions?.year ?? 0);
          return yearDiff || b.created_at.localeCompare(a.created_at);
        });
    },
  });

  const filtered = (songs ?? []).filter((entry) =>
    `${entry.artist} ${entry.song ?? ""} ${entry.section?.competitions?.year ?? ""}`.toLocaleLowerCase("fi-FI").includes(filter.toLocaleLowerCase("fi-FI")),
  );

  return (
    <PageShell title="Musiikki">
      <div className="mb-6 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 font-semibold"><ListMusic className="h-5 w-5 text-accent" /> Ryhämviisujen musiikkikirjasto</div>
      </div>

      <input
        aria-label="Hae kappaleita"
        className="mb-5 w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Hae artistia, kappaletta tai vuotta…"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />

      {isLoading && <p role="status" className="text-muted-foreground">Ladataan kappaleita…</p>}
      {error && (
        <div className="mb-5 rounded-xl border border-destructive/40 p-4">
          <p className="text-sm text-destructive">Kappaleiden lataaminen epäonnistui. Tarkista verkkoyhteys ja tietokantayhteys.</p>
          <Button className="mt-3" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Yritetään uudelleen…" : "Yritä uudelleen"}
          </Button>
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="rounded-xl border p-6 text-muted-foreground">
          {songs?.length ? "Haulla ei löytynyt kappaleita." : "Musiikkikirjastossa ei ole vielä kappaleita."}
        </p>
      )}

      <ul className="space-y-3">
        {filtered.map((entry) => {
          const embed = youtubeEmbed(entry.video_url);
          return (
            <li key={entry.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{entry.song}</div>
                  <div className="text-sm text-muted-foreground"><ArtistLink name={entry.artist} className="text-primary hover:underline" /></div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {entry.section?.competitions?.year ?? "Vuosi tuntematon"} · {entry.section?.type ?? ""}
                  </div>
                </div>
                {embed && entry.video_url ? (
                  <Button onClick={() => playMusicTrack({ title: entry.song ?? "Tuntematon kappale", artist: entry.artist, url: entry.video_url! })}>
                    <Play className="mr-2 h-4 w-4" /> Toista sivusoittimessa
                  </Button>
                ) : (
                  <span className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">Ei vielä kelvollista YouTube-videota</span>
                )}
                {embed && entry.video_url && (
                  <a href={entry.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                    <Youtube className="h-4 w-4" /> YouTube <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {admin.isAdmin && <MusicVideoEditor key={entry.id} entry={entry} />}
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}

function MusicVideoEditor({ entry }: { entry: MusicEntry }) {
  const admin = useAdmin();
  const [url, setUrl] = useState(entry.video_url ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    setUrl(entry.video_url ?? "");
  }, [entry.video_url]);

  return (
    <form
      className="mt-4 flex flex-wrap gap-2 border-t pt-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const cleanedUrl = url.trim();
        if (cleanedUrl && !youtubeEmbed(cleanedUrl)) {
          setMessage("Anna kelvollinen YouTube-linkki tai tyhjennä kenttä videolinkin poistamiseksi.");
          setMessageIsError(true);
          return;
        }

        setSaving(true);
        setMessage("");
        setMessageIsError(false);
        try {
          await admin.run({ type: "updateEntry", id: entry.id, video_url: cleanedUrl || null });
          setMessage("Linkki tallennettu.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Tallennus epäonnistui.");
          setMessageIsError(true);
        } finally {
          setSaving(false);
        }
      }}
    >
      <input
        aria-label={`YouTube-linkki kappaleelle ${entry.song ?? entry.artist}`}
        className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="YouTube-musiikkivideon linkki"
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <Button type="submit" disabled={saving}>{saving ? "Tallennetaan…" : "Tallenna linkki"}</Button>
      {message && <p role="status" className={`w-full text-sm ${messageIsError ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}
    </form>
  );
}
