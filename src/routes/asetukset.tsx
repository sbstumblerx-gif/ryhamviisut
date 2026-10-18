import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/lib/admin";

export const Route = createFileRoute("/asetukset")({
  head: () => ({
    meta: [
      { title: "Asetukset – Ryhämviisut" },
      { name: "description", content: "Ryhämviisujen asetukset." },
      { property: "og:title", content: "Asetukset – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisujen asetukset." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { isAdmin, login, logout, run } = useAdmin();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [inboxLoading, setInboxLoading] = useState(false);

  async function loadApplications() {
    setInboxLoading(true);
    try {
      const result = await run({ type: "listApplications" });
      setApplications((result as any).applications ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Hakemusten haku epäonnistui.");
    } finally {
      setInboxLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) void loadApplications();
  }, [isAdmin]);

  return (
    <PageShell title="Asetukset">
      <div className="tile max-w-md p-6 hover:transform-none">
        {isAdmin ? (
          <div className="space-y-4">
            <p className="text-success">Olet kirjautunut adminina.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadApplications()} disabled={inboxLoading}>{inboxLoading ? "Päivitetään…" : "Päivitä inbox"}</Button>
              <Button variant="secondary" onClick={logout}>Kirjaudu ulos</Button>
            </div>
            <section className="space-y-4 border-t border-border pt-5">
              <div>
                <h2 className="text-2xl font-semibold">Hakemusten inbox</h2>
                <p className="text-sm text-muted-foreground">Hakemukset näkyvät täällä. Voit vastata lähettäjälle; vastaus näkyy hänelle seurantakoodilla Osallistu-sivulla.</p>
              </div>
              {applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">{inboxLoading ? "Ladataan hakemuksia…" : "Inbox on tyhjä."}</p>
              ) : applications.map((application) => (
                <article key={application.id} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{application.applicant_name} · {application.application_type === "kilpailija" ? "Kilpailijahakemus" : application.application_type === "raati" ? "Raatihakemus" : "Väliesityshakemus"}</h3>
                      <p className="text-xs text-muted-foreground">{new Date(application.created_at).toLocaleString("fi-FI")}{application.contact_email ? ` · ${application.contact_email}` : ""}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">{application.admin_reply ? "Vastattu" : "Odottaa vastausta"}</span>
                  </div>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {Object.entries(application.payload ?? {}).map(([key, value]) => (
                      <div key={key} className="rounded-md bg-muted/50 p-2">
                        <dt className="font-medium">{({ artistName: "Artistinimi", songTitle: "Kappale", songLink: "Kappalelinkki", activeDuration: "Aktiivinen kesto (s)", credits: "Tekijät ja lähteet", description: "Kuvaus ja tekoälyn käyttö", guardianConsent: "Huoltajan suostumus", rulesAccepted: "Säännöt hyväksytty" } as Record<string, string>)[key] ?? key}</dt>
                        <dd className="mt-1 break-words whitespace-pre-wrap">{typeof value === "boolean" ? (value ? "Kyllä" : "Ei") : String(value ?? "—")}</dd>
                      </div>
                    ))}
                  </dl>
                  {application.admin_reply && <div className="rounded-md bg-muted p-3"><p className="text-sm font-semibold">Aiempi vastaus</p><p className="whitespace-pre-wrap text-sm">{application.admin_reply}</p></div>}
                  <form className="space-y-2" onSubmit={async (event) => {
                    event.preventDefault();
                    const reply = (replyDrafts[application.id] ?? application.admin_reply ?? "").trim();
                    if (!reply) return;
                    try {
                      await run({ type: "replyApplication", id: application.id, reply });
                      toast.success("Vastaus tallennettu.");
                      setReplyDrafts((current) => ({ ...current, [application.id]: "" }));
                      await loadApplications();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Vastauksen tallentaminen epäonnistui.");
                    }
                  }}>
                    <label className="block space-y-2 text-sm font-medium">Vastaus lähettäjälle
                      <textarea rows={3} required maxLength={10000} value={replyDrafts[application.id] ?? (application.admin_reply ?? "")} onChange={(event) => setReplyDrafts((current) => ({ ...current, [application.id]: event.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" placeholder="Kirjoita vastaus…" />
                    </label>
                    <Button type="submit">Tallenna ja lähetä vastaus</Button>
                  </form>
                </article>
              ))}
            </section>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await login(code);
                toast.success("Admin-tila päällä");
                setCode("");
              } catch {
                toast.error("Väärä koodi");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="text-sm text-muted-foreground">Koodi</label>
            <Input type="password" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button type="submit" disabled={busy || !code}>Vahvista</Button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
