import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { ArtistLink } from "@/components/ArtistLink";

export const Route = createFileRoute("/tilastot")({
  head: () => ({
    meta: [
      { title: "Tilastot – Ryhämviisut" },
      { name: "description", content: "Ryhämviisujen piste- ja raatitilastot." },
      { property: "og:title", content: "Tilastot – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisujen piste- ja raatitilastot." },
    ],
  }),
  component: StatisticsPage,
});

type Vote = { entry_id: string; points: number; rank: number };
type Entry = { id: string; artist: string; audience_points: number | null };
type Jury = { id: string; name: string; jury_votes: Vote[] };
type Section = {
  id: string;
  type: string;
  competitions: { year: number | null } | null;
  entries: Entry[];
  juries: Jury[];
};

const pointModes = [
  { value: "final-audience", label: "Yleisöpisteet" },
  { value: "final-jury", label: "Raatipisteet" },
  { value: "final-all", label: "Kaikki pisteet" },
  { value: "qual-audience", label: "Karsinnan yleisöpisteet" },
  { value: "qual-jury", label: "Karsinnan raatipisteet" },
  { value: "qual-all", label: "Karsinnan kaikki pisteet" },
] as const;

type PointMode = (typeof pointModes)[number]["value"];
type ArtistTotal = { name: string; points: number };

const normalize = (name: string) => name.trim().toLocaleLowerCase("fi-FI");

function StatisticsPage() {
  const [mode, setMode] = useState<PointMode>("final-all");
  const [special, setSpecial] = useState<"artist" | "jury">("artist");
  const [selectedArtist, setSelectedArtist] = useState("");
  const [selectedJury, setSelectedJury] = useState("");
  const [specialPhase, setSpecialPhase] = useState<"finaali" | "karsinta">("finaali");

  const { data: sections = [], isLoading, error } = useQuery({
    queryKey: ["statistics-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, type, competitions(year), entries(id, artist, audience_points), juries(id, name, jury_votes(entry_id, points, rank))");
      if (error) throw error;
      return (data ?? []) as unknown as Section[];
    },
  });

  const artists = useMemo(() => {
    const names = new Map<string, string>();
    for (const section of sections) for (const entry of section.entries ?? []) {
      if (entry.artist?.trim()) names.set(normalize(entry.artist), names.get(normalize(entry.artist)) ?? entry.artist.trim());
    }
    return [...names.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name, "fi"));
  }, [sections]);

  const juries = useMemo(() => {
    const names = new Map<string, string>();
    for (const section of sections) for (const jury of section.juries ?? []) {
      if (jury.name?.trim()) names.set(normalize(jury.name), names.get(normalize(jury.name)) ?? jury.name.trim());
    }
    return [...names.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name, "fi"));
  }, [sections]);

  const totals = useMemo<ArtistTotal[]>(() => {
    const isQualifying = mode.startsWith("qual-");
    const source = mode.endsWith("audience") ? "audience" : mode.endsWith("jury") ? "jury" : "all";
    const totalsByArtist = new Map<string, ArtistTotal>();

    for (const section of sections) {
      if (section.type !== (isQualifying ? "karsinta" : "finaali")) continue;
      for (const entry of section.entries ?? []) {
        const name = entry.artist?.trim();
        if (!name) continue;
        const key = normalize(name);
        const juryPoints = (section.juries ?? []).reduce(
          (sum, jury) => sum + (jury.jury_votes ?? []).filter((vote) => vote.entry_id === entry.id).reduce((s, vote) => s + (Number(vote.points) || 0), 0),
          0,
        );
        const audiencePoints = Number(entry.audience_points) || 0;
        const points = source === "audience" ? audiencePoints : source === "jury" ? juryPoints : audiencePoints + juryPoints;
        const current = totalsByArtist.get(key) ?? { name, points: 0 };
        current.points += points;
        totalsByArtist.set(key, current);
      }
    }

    return [...totalsByArtist.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "fi"));
  }, [sections, mode]);

  const juryGivingArtist = useMemo(() => {
    if (!selectedArtist) return [];
    const sums = new Map<string, { name: string; points: number }>();
    for (const section of sections) {
      if (section.type !== specialPhase) continue;
      const entryIds = new Set((section.entries ?? []).filter((e) => normalize(e.artist) === selectedArtist).map((e) => e.id));
      for (const jury of section.juries ?? []) {
        const key = normalize(jury.name);
        const current = sums.get(key) ?? { name: jury.name, points: 0 };
        current.points += (jury.jury_votes ?? []).filter((v) => entryIds.has(v.entry_id)).reduce((s, v) => s + (Number(v.points) || 0), 0);
        sums.set(key, current);
      }
    }
    return [...sums.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "fi"));
  }, [sections, selectedArtist, specialPhase]);

  const artistReceivingFromJury = useMemo(() => {
    if (!selectedJury) return [];
    const sums = new Map<string, ArtistTotal>();
    for (const section of sections) {
      if (section.type !== specialPhase) continue;
      for (const jury of section.juries ?? []) {
        if (normalize(jury.name) !== selectedJury) continue;
        for (const vote of jury.jury_votes ?? []) {
          const entry = (section.entries ?? []).find((e) => e.id === vote.entry_id);
          if (!entry?.artist?.trim()) continue;
          const key = normalize(entry.artist);
          const current = sums.get(key) ?? { name: entry.artist.trim(), points: 0 };
          current.points += Number(vote.points) || 0;
          sums.set(key, current);
        }
      }
    }
    return [...sums.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "fi"));
  }, [sections, selectedJury, specialPhase]);

  if (isLoading) return <PageShell title="Tilastot"><p className="text-muted-foreground">Ladataan tilastoja…</p></PageShell>;
  if (error) return <PageShell title="Tilastot"><p className="text-destructive">Tilastojen lataaminen epäonnistui.</p></PageShell>;

  return (
    <PageShell title="Tilastot">
      <p className="mb-6 text-muted-foreground">
        Pisteet lasketaan kaikista tallennetuista kilpailuista. Tavalliset pistevertailut koskevat finaaleja; karsintojen pisteet ovat omissa tilastoissaan.
      </p>

      <section className="mb-8 rounded-xl border bg-card p-4 sm:p-6">
        <label className="mb-2 block font-semibold" htmlFor="point-mode">Pistetilasto</label>
        <select id="point-mode" className="w-full max-w-md rounded-md border bg-background px-3 py-2" value={mode} onChange={(e) => setMode(e.target.value as PointMode)}>
          {pointModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <div className="mt-5 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left"><tr><th className="p-3">Sija</th><th className="p-3">Artisti</th><th className="p-3 text-right">Pisteet</th></tr></thead>
            <tbody>
              {totals.map((row, i) => <tr key={normalize(row.name)} className="border-t"><td className="p-3 text-muted-foreground">{i + 1}</td><td className="p-3"><ArtistLink name={row.name} className="font-medium text-primary hover:underline" /></td><td className="p-3 text-right font-semibold">{row.points}</td></tr>)}
              {totals.length === 0 && <tr><td colSpan={3} className="p-4 text-muted-foreground">Ei vielä pisteitä tässä kategoriassa.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-xl border bg-card p-4 sm:p-6">
        <h2 className="mb-2 text-2xl">Raadin pisteiden jakautuminen</h2>
        <p className="mb-4 text-sm text-muted-foreground">Valitse erikseen finaalien tai karsintojen raativertailu.</p>
        <label className="mb-2 block font-semibold" htmlFor="special-phase">Kilpailun vaihe</label>
        <select id="special-phase" className="mb-4 w-full max-w-md rounded-md border bg-background px-3 py-2" value={specialPhase} onChange={(e) => setSpecialPhase(e.target.value as "finaali" | "karsinta")}>
          <option value="finaali">Finaalit</option>
          <option value="karsinta">Karsinnat</option>
        </select>
        <label className="mb-2 block font-semibold" htmlFor="special-mode">Tilasto</label>
        <select id="special-mode" className="mb-4 w-full max-w-md rounded-md border bg-background px-3 py-2" value={special} onChange={(e) => setSpecial(e.target.value as "artist" | "jury")}>
          <option value="artist">Ketkä raadit ovat antaneet eniten pisteitä artistille?</option>
          <option value="jury">Kenelle raati on antanut eniten pisteitä?</option>
        </select>

        {special === "artist" ? (
          <>
            <label className="mb-2 block font-semibold" htmlFor="artist-choice">Valitse artisti</label>
            <select id="artist-choice" className="mb-4 w-full max-w-md rounded-md border bg-background px-3 py-2" value={selectedArtist} onChange={(e) => setSelectedArtist(e.target.value)}>
              <option value="">Valitse artisti…</option>
              {artists.map((artist) => <option key={artist.key} value={artist.key}>{artist.name}</option>)}
            </select>
            {selectedArtist && <Ranking rows={juryGivingArtist} firstLabel="Sija" nameLabel="Raati" />}
          </>
        ) : (
          <>
            <label className="mb-2 block font-semibold" htmlFor="jury-choice">Valitse raati</label>
            <select id="jury-choice" className="mb-4 w-full max-w-md rounded-md border bg-background px-3 py-2" value={selectedJury} onChange={(e) => setSelectedJury(e.target.value)}>
              <option value="">Valitse raati…</option>
              {juries.map((jury) => <option key={jury.key} value={jury.key}>{jury.name}</option>)}
            </select>
            {selectedJury && <Ranking rows={artistReceivingFromJury} firstLabel="Sija" nameLabel="Artisti" />}
          </>
        )}
      </section>
    </PageShell>
  );
}

function Ranking({ rows, firstLabel, nameLabel }: { rows: ArtistTotal[]; firstLabel: string; nameLabel: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left"><tr><th className="p-3">{firstLabel}</th><th className="p-3">{nameLabel}</th><th className="p-3 text-right">Raatipisteet</th></tr></thead>
        <tbody>
          {rows.map((row, i) => <tr key={normalize(row.name)} className="border-t"><td className="p-3 text-muted-foreground">{i + 1}</td><td className="p-3">{row.name}</td><td className="p-3 text-right font-semibold">{row.points}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={3} className="p-4 text-muted-foreground">Ei vielä pisteitä näillä valinnoilla.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
