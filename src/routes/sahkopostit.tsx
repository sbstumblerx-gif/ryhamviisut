import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/lib/admin";
import { emailAdmin, type EmailAdminAction } from "@/lib/artist-claims.functions";

export const Route = createFileRoute("/sahkopostit")({
  head: () => ({
    meta: [
      { title: "Sähköpostit – Ryhämviisut" },
      { name: "description", content: "Ylläpidon sähköposti- ja artistihakemusnäkymä." },
      { property: "og:title", content: "Sähköpostit – Ryhämviisut" },
      { property: "og:description", content: "Ylläpidon sähköposti- ja artistihakemusnäkymä." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailsPage,
});

const STATUS: Record<string, string> = { pending: "Odottaa", approved: "Hyväksytty", rejected: "Hylätty", revoked: "Peruttu", cancelled: "Peruttu (käyttäjä)" };
type Tab = "artist" | "all" | "blocked";

function EmailsPage() {
  const { isAdmin, adminLoading } = useAdmin();
  const call = useServerFn(emailAdmin);
  const [tab, setTab] = useState<Tab>("artist");
  const [blockEmail, setBlockEmail] = useState("");
  const { data, refetch, isLoading } = useQuery({ queryKey: ["admin-emails"], queryFn: () => call({ data: { type: "list" } }) as Promise<any>, enabled: isAdmin });

  async function act(action: EmailAdminAction, ok: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    try { await call({ data: action }); toast.success(ok); await refetch(); } catch (e) { toast.error(e instanceof Error ? e.message : "Toiminto epäonnistui."); }
  }

  if (adminLoading) return <PageShell title="Sähköpostit"><p className="text-sm text-muted-foreground">Tarkistetaan oikeuksia…</p></PageShell>;
  if (!isAdmin) return <PageShell title="Sähköpostit"><p className="text-sm text-muted-foreground">Tämä näkymä on vain ylläpitäjille. <Link to="/asetukset" className="text-primary hover:underline">Asetuksiin</Link></p></PageShell>;

  const blocks: any[] = data?.blocks ?? [];
  const blockedScopes = (email: string) => blocks.filter((b) => b.email === email).map((b) => b.scope as string);
  const BlockButtons = ({ email }: { email: string }) => {
    const s = blockedScopes(email);
    return <>
      {!s.includes("artist") && <Button size="sm" variant="outline" onClick={() => act({ type: "block", email, scope: "artist" }, "Artistiprofiilin pääsy estetty.", `Estetäänkö ${email} artistiprofiilista?`)}>Estä artistiprofiili</Button>}
      {!s.includes("app") && <Button size="sm" variant="destructive" onClick={() => act({ type: "block", email, scope: "app" }, "Sovelluksen pääsy estetty.", `Estetäänkö ${email} koko sovelluksesta?`)}>Estä sovellus</Button>}
    </>;
  };

  return (
    <PageShell title="Sähköpostit">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["artist", "all", "blocked"] as Tab[]).map((t) => (
            <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>{t === "artist" ? "Artistisähköpostit" : t === "all" ? "Kaikki sähköpostit" : "Estolista"}</Button>
          ))}
          <Button variant="ghost" onClick={() => void refetch()}>Päivitä</Button>
        </div>
        <p className="text-xs text-muted-foreground">Automaattista sähköposti-ilmoitusta ei lähetetä: hakemukset käsitellään tässä näkymässä ja hakija näkee tilan Kirjaudu artistina -sivulla.</p>
        {isLoading ? <p className="text-sm text-muted-foreground">Ladataan…</p> : tab === "artist" ? (
          !data?.claims.length ? <p className="text-sm text-muted-foreground">Ei artistihakemuksia.</p> : data.claims.map((c: any) => (
            <article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
              <div className="min-w-0">
                <p className="font-semibold">{c.artist_name} <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{STATUS[c.status]}</span></p>
                <p className="break-all text-sm">{c.email}</p>
                <p className="text-xs text-muted-foreground">Lähetetty {new Date(c.created_at).toLocaleString("fi-FI")}{c.decided_at ? ` · käsitelty ${new Date(c.decided_at).toLocaleString("fi-FI")}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status === "pending" && <>
                  <Button size="sm" onClick={() => act({ type: "decide", id: c.id, decision: "approved" }, "Hakemus hyväksytty.")}>Hyväksy</Button>
                  <Button size="sm" variant="outline" onClick={() => act({ type: "decide", id: c.id, decision: "rejected" }, "Hakemus hylätty.")}>Hylkää</Button>
                </>}
                {c.status === "approved" && <Button size="sm" variant="outline" onClick={() => act({ type: "revoke", id: c.id }, "Artistilinkitys peruttu.", "Perutaanko artistilinkitys? Käyttäjän tili säilyy.")}>Peru linkitys</Button>}
                <BlockButtons email={c.email} />
              </div>
            </article>
          ))
        ) : tab === "all" ? (
          (data?.users ?? []).map((u: any) => (
            <article key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">{u.email}</p>
                <p className="text-xs text-muted-foreground">{u.provider ?? "—"} · luotu {new Date(u.created_at).toLocaleDateString("fi-FI")}{blockedScopes(u.email).length ? ` · estetty: ${blockedScopes(u.email).map((s) => s === "app" ? "sovellus" : "artistiprofiili").join(", ")}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2"><BlockButtons email={u.email} /></div>
            </article>
          ))
        ) : (
          <div className="space-y-3">
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (blockEmail.trim()) void act({ type: "block", email: blockEmail.trim(), scope: "app" }, "Sähköposti estetty.").then(() => setBlockEmail("")); }}>
              <input type="email" required value={blockEmail} onChange={(e) => setBlockEmail(e.target.value)} placeholder="sahkoposti@esimerkki.fi" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base" aria-label="Estettävä sähköposti" />
              <Button type="submit" variant="destructive">Estä koko sovelluksesta</Button>
            </form>
            {!blocks.length ? <p className="text-sm text-muted-foreground">Estolista on tyhjä.</p> : blocks.map((b) => (
              <article key={b.email + b.scope} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div><p className="break-all text-sm font-medium">{b.email}</p><p className="text-xs text-muted-foreground">{b.scope === "app" ? "Koko sovellus" : "Vain artistiprofiili"} · {new Date(b.created_at).toLocaleDateString("fi-FI")}</p></div>
                <Button size="sm" variant="outline" onClick={() => act({ type: "unblock", email: b.email, scope: b.scope }, "Esto poistettu.")}>Poista esto</Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
