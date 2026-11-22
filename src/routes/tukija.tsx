import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CreditCard, ExternalLink, Heart, RefreshCw } from "lucide-react";
import { z } from "zod";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { SupporterBadge } from "@/components/SupporterBadge";
import { SupporterAppearance } from "@/components/SupporterAppearance";
import { useSupporter } from "@/components/SupporterProvider";
import { createSupporterCheckout, openSupporterPortal, verifySupporterCheckout } from "@/lib/supporter.functions";

export const Route = createFileRoute("/tukija")({
  validateSearch: z.object({ checkout: z.enum(["success", "cancel"]).optional(), session_id: z.string().max(300).optional() }),
  head: () => ({ meta: [
    { title: "Tukijajäsenyys – Ryhämviisut" }, { name: "description", content: "Ryhämviisujen tukijajäsenyys ja tilauksen hallinta." },
    { property: "og:title", content: "Tukijajäsenyys – Ryhämviisut" }, { property: "og:description", content: "Tue Ryhämviisuja ja hallitse vuosittaista tukijatilaustasi." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SupporterPage,
});

function SupporterPage() {
  const { subscribed, userId, isSignedIn, status, loading, error, refresh } = useSupporter();
  const { checkout, session_id: sessionId } = Route.useSearch();
  const verifyPayment = useServerFn(verifySupporterCheckout);
  const startCheckout = useServerFn(createSupporterCheckout);
  const portal = useServerFn(openSupporterPortal);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (checkout !== "success" || !sessionId || !userId) return;
    let active = true;
    void verifyPayment({ data: { sessionId } }).then((verified) => {
      if (!active) return;
      queryClient.setQueryData(["supporter", userId], verified);
      setMessage(verified.subscribed ? "Maksu vahvistettu. Tukijajäsenyys on voimassa." : "Maksua tarkistetaan. Päivitä tilanne hetken kuluttua.");
    }).catch(() => { if (active) setMessage("Maksua ei vielä voitu vahvistaa. Päivitä tilanne hetken kuluttua."); });
    return () => { active = false; };
  }, [checkout, sessionId, userId, verifyPayment, queryClient]);

  async function openPayment(manage: boolean) {
    // Open synchronously so browser popup protection does not swallow the Stripe page.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setBusy(true); setMessage("");
    try {
      const result = await (manage ? portal() : startCheckout());
      if (tab) tab.location.href = result.url;
      else window.location.assign(result.url);
    } catch (failure) {
      tab?.close();
      setMessage(failure instanceof Error ? failure.message : "Maksusivua ei voitu avata.");
    } finally { setBusy(false); }
  }

  return <PageShell title="Tukijajäsenyys">
    <section className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><Heart className="mb-3 h-10 w-10 text-primary" /><h2 className="text-3xl">Ryhämviisut-tukija</h2></div><SupporterBadge /></div>
      <p className="text-4xl font-semibold tabular-nums">1,99 € <span className="text-base font-normal text-muted-foreground">/ vuosi</span></p>
      {status?.testMode && <p className="text-sm font-medium text-primary">Testimaksut · oikeaa rahaa ei veloiteta</p>}
      {status && !status.benefitsReady && <p role="status" className="text-sm text-muted-foreground">Äänestys- ja Agentti-edut odottavat käyttöönottoa. Oikean rahan maksut eivät ole vielä käytössä.</p>}
      {subscribed ? <div className="space-y-3"><p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="h-5 w-5" />Tukijajäsenyys on voimassa</p><p className="text-sm text-muted-foreground">{status?.cancelAtPeriodEnd ? "Päättyy" : "Uusiutuu"} {status?.activeUntil ? new Date(status.activeUntil).toLocaleDateString("fi-FI") : "—"}</p><Button variant="outline" disabled={busy} onClick={() => void openPayment(true)}><CreditCard />Hallitse tilausta<ExternalLink /></Button></div>
        : !isSignedIn ? <Button asChild><Link to="/kirjaudu">Kirjaudu liittyäksesi</Link></Button>
        : <div className="space-y-3"><p className="text-sm text-muted-foreground">Vuosittainen tilaus. Voit perua uusiutumisen milloin tahansa.</p><Button disabled={busy || loading || Boolean(error)} onClick={() => void openPayment(false)}><Heart />{busy ? "Avataan…" : status?.testMode ? "Testaa tukijajäsenyyttä" : "Liity tukijaksi"}<ExternalLink /></Button></div>}
      {isSignedIn && <Button variant="ghost" size="sm" disabled={loading || busy} onClick={() => void refresh()}><RefreshCw className={loading ? "animate-spin" : ""} />Päivitä tilaus</Button>}
      {(message || error || checkout === "cancel") && <p role="status" className="text-sm text-muted-foreground">{message || (error ? "Tilausta ei voitu tarkistaa. Yritä uudelleen." : "Maksaminen keskeytettiin. Voit jatkaa myöhemmin.")}</p>}
    </section>
    <SupporterAppearance />
  </PageShell>;
}