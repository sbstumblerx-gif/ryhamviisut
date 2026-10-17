import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCircle2, LockKeyhole, Vote } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { getPublicVotingPoll, castVotingBallot } from "@/lib/voting.functions";

export const Route = createFileRoute("/aanesta")({
  head: () => ({ meta: [{ title: "Äänestä – Ryhämviisut" }, { name: "description", content: "Ryhämviisujen yleisöäänestykset." }] }),
  component: VotingPage,
});

type Entry = { id: string; artist: string; song: string | null; year: number | null };
type Option = { id: string; artist: string; song: string | null; votes: number; percent: number; audience_points: number };
type Poll = { id: string; title: string; status: string; totalVotes: number; points_calculated: boolean; total_audience_points: number | null; options: Option[] };

function VotingPage() {
  const { isAdmin, run } = useAdmin();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [poll, setPoll] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [title, setTitle] = useState("Ryhämviisut 2027 finaali");
  const [adminPolls, setAdminPolls] = useState<Poll[]>([]);
  const [totalPoints, setTotalPoints] = useState("100");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refreshAdmin = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const results = await Promise.all([run({ type: "listVotingEntries" }), run({ type: "getVotingData" })]);
      setEntries((((results[0] as any).entries ?? []) as Entry[]));
      setAdminPolls((((results[1] as any).polls ?? []) as Poll[]));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Adminin tietojen lataus epäonnistui."); }
  }, [isAdmin, run]);

  const refreshPublic = useCallback(async (token: string) => {
    try {
      const activePoll = await getPublicVotingPoll({ data: { accessToken: token } });
      setPoll(activePoll);
      setHasVoted(Boolean(activePoll?.hasVoted));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Äänestyksen lataus epäonnistui."); }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      if (token) void refreshPublic(token);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      setAccessToken(token); setPoll(null); setHasVoted(false);
      if (token) void refreshPublic(token);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [refreshPublic]);

  useEffect(() => {
    if (!isAdmin) return;
    void refreshAdmin();
    const timer = window.setInterval(() => void refreshAdmin(), 5000);
    return () => window.clearInterval(timer);
  }, [isAdmin, refreshAdmin]);

  useEffect(() => {
    if (isAdmin || !accessToken) return;
    const timer = window.setInterval(() => void refreshPublic(accessToken), 5000);
    return () => window.clearInterval(timer);
  }, [isAdmin, accessToken, refreshPublic]);

  async function adminAction(action: any, success: string) {
    setBusy(true); setMessage("");
    try { await run(action); toast.success(success); await refreshAdmin(); }
    catch (error) { const text = error instanceof Error ? error.message : "Toiminto epäonnistui."; setMessage(text); toast.error(text); }
    finally { setBusy(false); }
  }

  async function createPoll() {
    if (!title.trim() || selectedEntries.length < 2) { setMessage("Anna nimi ja valitse vähintään kaksi kappaletta."); return; }
    await adminAction({ type: "createVotingPoll", title: title.trim(), entryIds: selectedEntries }, "Äänestysluonnos luotu.");
    setSelectedEntries([]);
  }

  async function vote() {
    if (!accessToken || !poll || !selectedOption) return;
    setBusy(true); setMessage("");
    try {
      await castVotingBallot({ data: { accessToken, pollId: poll.id, optionId: selectedOption } });
      setHasVoted(true); toast.success("Äänesi on tallennettu!"); await refreshPublic(accessToken);
    } catch (error) { const text = error instanceof Error ? error.message : "Äänen tallentaminen epäonnistui."; setMessage(text); toast.error(text); }
    finally { setBusy(false); }
  }

  return (
    <PageShell title="Äänestä">
      {isAdmin ? (
        <div className="space-y-8">
          <section className="tile space-y-4 p-6 hover:transform-none">
            <h2 className="text-2xl font-semibold">Luo äänestys</h2>
            <p className="text-sm text-muted-foreground">Nimeä äänestys, valitse kilpailuun lisätyt kappaleet ja paina Aloita, kun luonnos on valmis.</p>
            <label className="block space-y-1.5 text-sm font-medium">Äänestyksen nimi
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ryhämviisut 2027 finaali" />
            </label>
            <h3 className="font-semibold">Äänestyskohteet ({selectedEntries.length} valittu)</h3>
            {entries.length === 0 ? <p className="text-sm text-muted-foreground">Kappaleita ei löytynyt. Lisää ensin kappaleet kilpailun osioihin.</p> : (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3">
                {entries.map((entry) => (
                  <label key={entry.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                    <input type="checkbox" className="mt-1 h-4 w-4" checked={selectedEntries.includes(entry.id)} onChange={(e) => setSelectedEntries((current) => e.target.checked ? [...current, entry.id] : current.filter((id) => id !== entry.id))} />
                    <span><span className="font-medium">{entry.artist}</span>{entry.song && <span> — {entry.song}</span>}<span className="block text-xs text-muted-foreground">{entry.year ?? "Vuosi tuntematon"}</span></span>
                  </label>
                ))}
              </div>
            )}
            <Button disabled={busy || !title.trim() || selectedEntries.length < 2} onClick={createPoll}>Luo luonnos</Button>
          </section>
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Äänestykset ja tulokset</h2>
            {adminPolls.length === 0 && <p className="text-muted-foreground">Äänestyksiä ei ole vielä luotu.</p>}
            {adminPolls.map((item) => (
              <div key={item.id} className="tile space-y-4 p-5 hover:transform-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="text-xl font-semibold">{item.title}</h3><p className="text-sm text-muted-foreground">{item.status === "draft" ? "Luonnos" : item.status === "active" ? "Käynnissä" : "Suljettu"} · {item.totalVotes} ääntä</p></div>
                  {item.status === "draft" && <Button disabled={busy} onClick={() => adminAction({ type: "startVotingPoll", pollId: item.id }, "Äänestys aloitettu.")}>Aloita</Button>}
                  {item.status === "active" && <Button variant="destructive" disabled={busy} onClick={() => adminAction({ type: "closeVotingPoll", pollId: item.id }, "Äänestys suljettu.")}>Sulje äänestys</Button>}
                </div>
                <div className="space-y-3">
                  {item.options.map((option) => (
                    <div key={option.id} className="space-y-1.5">
                      <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{option.artist}{option.song ? " — " + option.song : ""}</span><span className="tabular-nums">{option.votes} ääntä · {option.percent.toFixed(1)}%{item.points_calculated ? " · " + option.audience_points + " pistettä" : ""}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: option.percent + "%" }} /></div>
                    </div>
                  ))}
                </div>
                {item.status === "closed" && !item.points_calculated && (
                  <div className="flex flex-wrap items-end gap-3 border-t pt-4">
                    <label className="min-w-40 flex-1 space-y-1.5 text-sm font-medium">Yleisöpisteiden kokonaismäärä
                      <Input type="number" min="0" max="1000000" step="1" value={totalPoints} onChange={(e) => setTotalPoints(e.target.value)} />
                    </label>
                    <Button disabled={busy || totalPoints.trim() === "" || !Number.isInteger(Number(totalPoints)) || Number(totalPoints) < 0 || Number(totalPoints) > 1000000} onClick={() => adminAction({ type: "calculateVotingPoints", pollId: item.id, totalPoints: Number(totalPoints) }, "Yleisöpisteet laskettu.")}>Laske pisteet</Button>
                  </div>
                )}
                {item.points_calculated && <p className="text-sm font-medium text-primary">Pisteet laskettu · kokonaismäärä {item.total_audience_points}</p>}
              </div>
            ))}
          </section>
        </div>
      ) : !accessToken ? (
        <section className="mx-auto max-w-xl space-y-4 rounded-2xl border bg-card p-8 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-primary" />
          <h2 className="text-2xl font-semibold">Kirjaudu äänestääksesi</h2>
          <p className="text-muted-foreground">Äänestykseen voi osallistua vain kirjautuneena. Äänimäärät ja tulokset eivät näy äänestäjille.</p>
          <Button asChild><Link to="/kirjaudu">Kirjaudu sisään</Link></Button>
        </section>
      ) : poll ? (
        <section className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-card p-6 sm:p-8">
          <div className="text-center"><Vote className="mx-auto mb-3 h-9 w-9 text-primary" /><h2 className="text-2xl font-semibold">{poll.title}</h2><p className="mt-2 text-sm text-muted-foreground">Valitse yksi kappale. Tulokset näkyvät vain adminille.</p></div>
          {hasVoted ? (
            <div className="space-y-2 rounded-xl bg-muted/50 p-5 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-primary" /><p className="font-semibold">Äänesi on vastaanotettu.</p><p className="text-sm text-muted-foreground">Kiitos osallistumisesta! Et voi äänestää uudelleen.</p></div>
          ) : (
            <>
              <div className="space-y-2">{poll.options.map((option: any) => (
                <label key={option.id} className={"flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors " + (selectedOption === option.id ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                  <input type="radio" name="voting-option" className="mt-1 h-4 w-4" value={option.id} checked={selectedOption === option.id} onChange={() => setSelectedOption(option.id)} />
                  <span><span className="font-semibold">{option.artist}</span>{option.song && <span className="block text-sm text-muted-foreground">{option.song}</span>}</span>
                </label>
              ))}</div>
              <Button className="w-full" disabled={busy || !selectedOption} onClick={vote}>Lähetä ääni</Button>
            </>
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-xl space-y-3 rounded-2xl border bg-card p-8 text-center">
          <Bell className="mx-auto h-10 w-10 text-primary" />
          <h2 className="text-2xl font-semibold">Äänestys ei ole käynnissä.</h2>
          <p className="text-muted-foreground">Kun admin aloittaa äänestyksen, se ilmestyy tänne. Suljettuja äänestyksiä ei näytetä äänestäjille.</p>
        </section>
      )}
      {message && <p role="status" className="mt-5 rounded-lg border p-3 text-sm text-muted-foreground">{message}</p>}
    </PageShell>
  );
}
