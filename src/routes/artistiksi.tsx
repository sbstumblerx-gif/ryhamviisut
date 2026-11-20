import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Chrome, Mic2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { cancelArtistClaim, getMyArtistStatus, submitArtistClaim } from "@/lib/artist-claims.functions";

export const Route = createFileRoute("/artistiksi")({
  head: () => ({
    meta: [
      { title: "Kirjaudu artistina – Ryhämviisut" },
      { name: "description", content: "Hae artistivahvistusta Ryhämviisuissa Google-tilillä." },
      { property: "og:title", content: "Kirjaudu artistina – Ryhämviisut" },
      { property: "og:description", content: "Vahvista itsesi Ryhämviisujen artistiksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArtistClaimPage,
});

const STATUS: Record<string, string> = { pending: "Odottaa käsittelyä", approved: "Hyväksytty", rejected: "Hylätty", revoked: "Peruttu", cancelled: "Peruttu" };

function ArtistClaimPage() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [slug, setSlug] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useServerFn(getMyArtistStatus);
  const submit = useServerFn(submitArtistClaim);
  const cancel = useServerFn(cancelArtistClaim);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const { data, refetch, isLoading } = useQuery({ queryKey: ["my-artist-status", userId], queryFn: () => load(), enabled: !!userId });
  const active = data?.claims.find((c) => c.status === "pending" || c.status === "approved");

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/artistiksi` });
    if (result.error) { toast.error("Google-kirjautuminen epäonnistui."); setBusy(false); }
  }

  return (
    <PageShell title="Kirjaudu artistina">
      <div className="tile mx-auto max-w-xl space-y-5 p-6 hover:transform-none">
        <div className="space-y-1 text-center">
          <Mic2 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="text-2xl font-semibold">Artistivahvistus</h2>
          <p className="text-sm text-muted-foreground">Kirjaudu Googlella, valitse artisti jota edustat ja lähetä hakemus ylläpidon hyväksyttäväksi. Tilisi toimii normaalisti koko ajan.</p>
        </div>
        {userId === undefined ? <p className="text-sm text-muted-foreground">Ladataan…</p> : !userId ? (
          <Button className="w-full" variant="outline" disabled={busy} onClick={google}><Chrome /> Jatka Googlella</Button>
        ) : isLoading || !data ? <p className="text-sm text-muted-foreground">Ladataan…</p> : !data.googleVerified ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Artistihakemus vaatii Google-kirjautumisen vahvistetulla sähköpostilla.</p>
            <Button className="w-full" variant="outline" disabled={busy} onClick={async () => { await supabase.auth.signOut(); await google(); }}><Chrome /> Kirjaudu Google-tilillä</Button>
          </div>
        ) : active ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="font-semibold">{active.artist_name}</p>
            <p className="text-sm">Tila: <span className="font-medium">{STATUS[active.status]}</span></p>
            <p className="text-xs text-muted-foreground">Lähetetty {new Date(active.created_at).toLocaleString("fi-FI")}</p>
            {active.status === "approved" && <Button asChild variant="outline"><Link to="/artistit/$artist" params={{ artist: active.artist_slug }}>Avaa artistisivu</Link></Button>}
            {active.status === "pending" && <Button variant="outline" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await cancel({ data: { id: active.id } }); toast.success("Hakemus peruttu."); await refetch(); } catch (e) { toast.error(e instanceof Error ? e.message : "Peruminen epäonnistui."); } finally { setBusy(false); }
            }}>Peru hakemus</Button>}
          </div>
        ) : (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            if (!slug) return;
            setBusy(true);
            try { await submit({ data: { slug } }); toast.success("Hakemus lähetetty ylläpidolle."); await refetch(); } catch (err) { toast.error(err instanceof Error ? err.message : "Lähetys epäonnistui."); } finally { setBusy(false); }
          }}>
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" placeholder="Hae artistia…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Hae artistia" />
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {data.artists.filter((a) => a.name.toLocaleLowerCase("fi-FI").includes(filter.toLocaleLowerCase("fi-FI"))).map((a) => (
                <label key={a.slug} className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${slug === a.slug ? "bg-primary/10" : "hover:bg-muted"}`}>
                  <input type="radio" name="artist" value={a.slug} checked={slug === a.slug} onChange={() => setSlug(a.slug)} />{a.name}
                </label>
              ))}
              {!data.artists.length && <p className="p-2 text-sm text-muted-foreground">Artisteja ei vielä ole.</p>}
            </div>
            <Button type="submit" className="w-full" disabled={!slug || busy}>Lähetä artistihakemus</Button>
          </form>
        )}
        {data?.claims.filter((c) => c !== active).length ? (
          <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <p className="font-medium">Aiemmat hakemukset</p>
            {data.claims.filter((c) => c !== active).map((c) => <p key={c.id}>{c.artist_name} · {STATUS[c.status]} · {new Date(c.created_at).toLocaleDateString("fi-FI")}</p>)}
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
