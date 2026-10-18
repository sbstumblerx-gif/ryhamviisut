import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Music2, Trophy, Users, Star, Gavel, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SECTION_LABEL, artistDetailQuery } from "@/lib/queries";
import { playMusicTrack } from "@/components/MusicPlayer";
import { useAdmin, youtubeEmbed } from "@/lib/admin";

export const Route = createFileRoute("/artistit/$artist")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.artist.replace(/-/g, " ")} – Ryhämviisut` },
      { name: "description", content: "Artistin kilpailuhistoria ja tilastot Ryhämviisuissa." },
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

  const sectionLabel = (type: string) => SECTION_LABEL[type as keyof typeof SECTION_LABEL] ?? type;
  const newestFirst = [...data.appearances].sort((a, b) =>
    (b.year ?? 0) - (a.year ?? 0) || b.created_at.localeCompare(a.created_at),
  );

  // Show each distinct song once; keep the newest participation and any available video link.
  const songsByName = new Map<string, (typeof newestFirst)[number]>();
  for (const entry of newestFirst) {
    if (!entry.song?.trim()) continue;
    const key = entry.song.trim();
    const current = songsByName.get(key);
    if (!current) songsByName.set(key, entry);
    else if (!current.video_url && entry.video_url) songsByName.set(key, { ...current, video_url: entry.video_url });
  }
  const songs = [...songsByName.values()].sort((a, b) =>
    (b.year ?? 0) - (a.year ?? 0) || b.created_at.localeCompare(a.created_at),
  );

  const scoredAppearances = newestFirst.filter((entry) => entry.sectionType === "karsinta" || entry.sectionType === "finaali");
  const participationKeys = new Set(scoredAppearances.map((entry) => entry.competitionId ?? `section:${entry.sectionId}`));
  const audiencePoints = scoredAppearances.reduce((sum, entry) => sum + (Number(entry.audience_points) || 0), 0);
  const juryPoints = scoredAppearances.reduce((sum, entry) => sum + entry.juries.reduce(
    (jurySum, jury) => jurySum + (jury.jury_votes ?? [])
      .filter((vote) => vote.entry_id === entry.id)
      .reduce((voteSum, vote) => voteSum + (Number(vote.points) || 0), 0),
    0,
  ), 0);

  const finals = newestFirst.filter((entry) => entry.sectionType === "finaali");
  const wins = finals.filter((entry) => {
    const totalFor = (candidate: (typeof entry.sectionEntries)[number]) => {
      const juryTotal = entry.juries.reduce((sum, jury) => sum + (jury.jury_votes ?? [])
        .filter((vote) => vote.entry_id === candidate.id)
        .reduce((voteSum, vote) => voteSum + (Number(vote.points) || 0), 0), 0);
      return (Number(candidate.audience_points) || 0) + juryTotal;
    };
    const artistTotal = totalFor(entry);
    const highest = Math.max(...entry.sectionEntries.map(totalFor), 0);
    return artistTotal > 0 && artistTotal === highest;
  }).length;

  return (
    <PageShell title={data.name} back="/artistit">
      <section className="mb-8">
        <h2 className="mb-4 text-2xl">Tilastot</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard icon={<Users className="h-5 w-5" />} label="Osallistumiset" value={participationKeys.size} />
          <StatCard icon={<Star className="h-5 w-5" />} label="Pisteet yhteensä" value={audiencePoints + juryPoints} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Yleisöpisteet" value={audiencePoints} />
          <StatCard icon={<Gavel className="h-5 w-5" />} label="Raatipisteet" value={juryPoints} />
          <StatCard icon={<Trophy className="h-5 w-5" />} label="Finaalivoitot" value={wins} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl">Kappaleet</h2>
        {songs.length === 0 ? (
          <p className="text-muted-foreground">Artistilta ei löydy kappaleita.</p>
        ) : (
          <ul className="space-y-2">
            {songs.map((entry) => {
              const embed = youtubeEmbed(entry.video_url);
              return (
                <li key={entry.song} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
                  <Music2 className="h-5 w-5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{entry.song}</p>
                    <p className="text-sm text-muted-foreground">{entry.year ?? "Vuosi tuntematon"} · {sectionLabel(entry.sectionType)}</p>
                  </div>
                  {embed && entry.video_url ? (
                    <button
                      className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                      onClick={() => playMusicTrack({ title: entry.song ?? "Tuntematon kappale", artist: data.name!, url: entry.video_url! })}
                    >
                      <Play className="mr-2 h-4 w-4" /> Toista
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Ei videolinkkiä</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-2xl">Osallistumiset</h2>
        {newestFirst.length === 0 ? (
          <p className="text-muted-foreground">Artistilla ei ole vielä kilpailumerkintöjä.</p>
        ) : (
          <ul className="space-y-3">
            {newestFirst.map((entry) => (
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
      </section>
    </PageShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div>
      <p className="font-display text-3xl text-accent">{value}</p>
    </div>
  );
}
