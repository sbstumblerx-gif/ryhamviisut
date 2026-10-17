import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin, youtubeEmbed } from "@/lib/admin";
import { SECTION_LABEL, sectionQuery } from "@/lib/queries";
import { ArtistLink } from "@/components/ArtistLink";

export const Route = createFileRoute("/osio/$id")({
  head: () => ({
    meta: [
      { title: "Osio – Ryhmäviisut" },
      { name: "description", content: "Ryhmäviisujen osion artistit, kappaleet ja tulokset." },
      { property: "og:title", content: "Osio – Ryhmäviisut" },
      { property: "og:description", content: "Ryhmäviisujen osion artistit, kappaleet ja tulokset." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sectionQuery(params.id)),
  component: SectionPage,
});

type Admin = ReturnType<typeof useAdmin>;
const fail = (e: Error) => toast.error(e.message);

function SectionPage() {
  const { id } = Route.useParams();
  const { data: s } = useSuspenseQuery(sectionQuery(id));
  const admin = useAdmin();
  if (!s) return <PageShell title="Osiota ei löytynyt" back="/kilpailut"><span /></PageShell>;

  const year = s.competitions?.year;
  const entries = [...s.entries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const scored = s.type === "karsinta" || s.type === "finaali";
  const withSong = s.type !== "artistijulkistus";
  const embed = youtubeEmbed(s.video_url);

  return (
    <PageShell title={`${SECTION_LABEL[s.type]} ${year ?? ""}`} back={year ? `/kilpailut/${year}` : "/kilpailut"}>
      <section className="mb-8 space-y-4">
        {embed && (
          <div className="aspect-video overflow-hidden rounded-xl border">
            <iframe src={embed} className="h-full w-full" allowFullScreen title="Video" />
          </div>
        )}
        {admin.isAdmin && <VideoEditor sectionId={s.id} current={s.video_url} admin={admin} />}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-3xl">{scored ? "Kilpailijat" : "Artistit"}</h2>
        <ul className="space-y-2">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} withSong={withSong} scored={scored} admin={admin} />
          ))}
          {entries.length === 0 && <p className="text-muted-foreground">Ei vielä artisteja.</p>}
        </ul>
        {admin.isAdmin && <AddEntry sectionId={s.id} withSong={withSong} admin={admin} />}
      </section>

      {scored && <Results section={s} entries={entries} />}
      {scored && <Juries section={s} entries={entries} admin={admin} />}
    </PageShell>
  );
}

function VideoEditor({ sectionId, current, admin }: { sectionId: string; current: string | null; admin: Admin }) {
  const [url, setUrl] = useState(current ?? "");
  return (
    <div className="flex gap-2">
      <Input placeholder="YouTube-linkki" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Button onClick={() => admin.run({ type: "updateSection", id: sectionId, video_url: url || null }).then(() => toast.success("Tallennettu"), fail)}>
        Tallenna video
      </Button>
    </div>
  );
}

type Entry = { id: string; artist: string; song: string | null; audience_points: number; status: string | null };

function EntryRow({ entry, withSong, scored, admin }: { entry: Entry; withSong: boolean; scored: boolean; admin: Admin }) {
  const [pts, setPts] = useState(String(entry.audience_points));
  useEffect(() => setPts(String(entry.audience_points)), [entry.audience_points]);
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex-1">
        <div className="font-semibold"><ArtistLink name={entry.artist} className="text-primary hover:underline" /></div>
        {withSong && entry.song && <div className="text-sm text-muted-foreground">{entry.song}</div>}
      </div>
      {scored && (
        admin.isAdmin ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Yleisö
            <Input
              type="number"
              className="w-20"
              value={pts}
              onChange={(e) => setPts(e.target.value)}
              onBlur={() => Number(pts) !== entry.audience_points && admin.run({ type: "updateEntry", id: entry.id, audience_points: Number(pts) || 0 }).catch(fail)}
            />
          </label>
        ) : (
          <span className="text-sm text-muted-foreground">Yleisö: {entry.audience_points}</span>
        )
      )}
      {admin.isAdmin && (
        <button aria-label="Poista" className="text-muted-foreground hover:text-destructive" onClick={() => confirm("Poistetaanko?") && admin.run({ type: "deleteEntry", id: entry.id }).catch(fail)}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function AddEntry({ sectionId, withSong, admin }: { sectionId: string; withSong: boolean; admin: Admin }) {
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");
  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        admin.run({ type: "addEntry", section_id: sectionId, artist, song: song || null }).then(() => { setArtist(""); setSong(""); }, fail);
      }}
    >
      <Input placeholder="Artisti" value={artist} onChange={(e) => setArtist(e.target.value)} className="max-w-56" />
      {withSong && <Input placeholder="Kappale" value={song} onChange={(e) => setSong(e.target.value)} className="max-w-56" />}
      <Button type="submit" disabled={!artist.trim()}>Lisää</Button>
    </form>
  );
}

type Vote = { entry_id: string; rank: number; points: number };
type Jury = { id: string; name: string; created_at: string; jury_votes: Vote[] };
type Section = { id: string; juries: Jury[] };

function Juries({ section, entries, admin }: { section: Section; entries: Entry[]; admin: Admin }) {
  const [name, setName] = useState("");
  const juries = [...section.juries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!admin.isAdmin) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-3xl">Raadit</h2>
      <div className="space-y-4">
        {juries.map((j) => <JuryEditor key={j.id} jury={j} entries={entries} admin={admin} />)}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          admin.run({ type: "addJury", section_id: section.id, name }).then(() => setName(""), fail);
        }}
      >
        <Input placeholder="Raadin nimi" value={name} onChange={(e) => setName(e.target.value)} className="max-w-64" />
        <Button type="submit" disabled={!name.trim()}>Lisää raati</Button>
      </form>
    </section>
  );
}

function JuryEditor({ jury, entries, admin }: { jury: Jury; entries: Entry[]; admin: Admin }) {
  const initial = useMemo(() => {
    const byEntry = new Map(jury.jury_votes.map((v) => [v.entry_id, v]));
    const ranked = [...entries].sort((a, b) => (byEntry.get(a.id)?.rank ?? 9999) - (byEntry.get(b.id)?.rank ?? 9999));
    return ranked.map((e) => ({ entry: e, points: String(byEntry.get(e.id)?.points ?? 0) }));
  }, [jury.jury_votes, entries]);
  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(i, 1);
    if (item) next.splice(j, 0, item);
    setRows(next);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-2xl text-accent">{jury.name}</h3>
        <button aria-label="Poista raati" className="text-muted-foreground hover:text-destructive" onClick={() => confirm("Poistetaanko raati?") && admin.run({ type: "deleteJury", id: jury.id }).catch(fail)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <ol className="space-y-1">
        {rows.map((r, i) => (
          <li key={r.entry.id} className="flex items-center gap-2">
            <span className="w-6 text-right text-muted-foreground">{i + 1}.</span>
            <span className="flex-1"><ArtistLink name={r.entry.artist} className="text-primary hover:underline" /></span>
            <button aria-label="Ylös" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-accent"><ArrowUp className="h-4 w-4" /></button>
            <button aria-label="Alas" onClick={() => move(i, 1)} className="text-muted-foreground hover:text-accent"><ArrowDown className="h-4 w-4" /></button>
            <Input
              type="number"
              className="w-20"
              value={r.points}
              onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, points: e.target.value } : x)))}
            />
            <span className="text-sm text-muted-foreground">p</span>
          </li>
        ))}
      </ol>
      <Button
        className="mt-3"
        onClick={() =>
          admin
            .run({ type: "setJuryVotes", jury_id: jury.id, votes: rows.map((r, i) => ({ entry_id: r.entry.id, rank: i + 1, points: Number(r.points) || 0 })) })
            .then(() => toast.success("Raadin pisteet tallennettu"), fail)
        }
      >
        Tallenna raati
      </Button>
    </div>
  );
}

function Results({ section, entries }: { section: Section; entries: Entry[] }) {
  const admin = useAdmin();
  const juries = [...section.juries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const rows = entries
    .map((e) => {
      const jp = juries.map((j) => j.jury_votes.find((v) => v.entry_id === e.id)?.points ?? 0);
      return { e, jp, total: e.audience_points + jp.reduce((a, b) => a + b, 0) };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <section>
      <h2 className="mb-3 text-3xl">Tulokset</h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Artisti</th>
              <th className="p-3 text-right">Yleisö</th>
              {juries.map((j) => <th key={j.id} className="p-3 text-right">{j.name}</th>)}
              <th className="p-3 text-right">Yht.</th>
              <th className="p-3">Tila</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, jp, total }, i) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 text-muted-foreground">{i + 1}</td>
                <td className="p-3">
                  <div className="font-semibold"><ArtistLink name={e.artist} className="text-primary hover:underline" /></div>
                  {e.song && <div className="text-muted-foreground">{e.song}</div>}
                </td>
                <td className="p-3 text-right">{e.audience_points}</td>
                {jp.map((p, k) => <td key={k} className="p-3 text-right">{p}</td>)}
                <td className="p-3 text-right font-display text-xl text-accent">{total}</td>
                <td className="p-3">
                  {admin.isAdmin ? (
                    <select
                      className="rounded-md border bg-input px-2 py-1"
                      value={e.status ?? ""}
                      onChange={(ev) => admin.run({ type: "updateEntry", id: e.id, status: (ev.target.value || null) as "eteni" | "karsiutui" | null }).catch(fail)}
                    >
                      <option value="">–</option>
                      <option value="eteni">Eteni finaaliin</option>
                      <option value="karsiutui">Karsiutui</option>
                    </select>
                  ) : e.status === "eteni" ? (
                    <span className="text-success">Eteni finaaliin</span>
                  ) : e.status === "karsiutui" ? (
                    <span className="text-destructive">Karsiutui</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
