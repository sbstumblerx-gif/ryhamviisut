import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, BellRing, CircleAlert } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/aanesta")({
  head: () => ({
    meta: [
      { title: "Äänestä – Ryhämviisut" },
      { name: "description", content: "Ryhämviisujen äänestykset ja ilmoitukset." },
      { property: "og:title", content: "Äänestä – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisujen äänestykset ja ilmoitukset." },
    ],
  }),
  component: VotingPage,
});

const PREFERENCE_KEY = "ryhamviisut-voting-notifications";

function VotingPage() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PREFERENCE_KEY) === "enabled";
  });
  const [message, setMessage] = useState("");

  async function subscribe() {
    setMessage("");
    if (typeof window === "undefined" || !("Notification" in window)) {
      setMessage("Tämä selain ei tue ilmoituksia. Voit tarkistaa äänestystilanteen etusivulta, kun avaat sovelluksen seuraavan kerran.");
      return;
    }

    if (!window.isSecureContext) {
      setMessage("Ilmoitukset vaativat suojatun HTTPS-yhteyden.");
      return;
    }

    try {
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

      if (permission !== "granted") {
        setMessage(permission === "denied"
          ? "Selaimen ilmoituslupa on estetty. Voit sallia ilmoitukset selaimen sivustoasetuksista."
          : "Ilmoituslupaa ei annettu. Voit yrittää uudelleen myöhemmin.");
        return;
      }

      window.localStorage.setItem(PREFERENCE_KEY, "enabled");
      setEnabled(true);
      setMessage("Ilmoituslupa on annettu tässä selaimessa. Äänestysten automaattiset ilmoitukset otetaan käyttöön, kun ilmoituspalvelu on yhdistetty.");
    } catch {
      setMessage("Ilmoitusluvan pyytäminen epäonnistui. Tarkista selaimen asetukset ja yritä uudelleen.");
    }
  }

  function disableNotifications() {
    window.localStorage.removeItem(PREFERENCE_KEY);
    setEnabled(false);
    setMessage("Äänestysilmoitukset on poistettu käytöstä tässä selaimessa.");
  }

  return (
    <PageShell title="Äänestä">
      <section className="mx-auto max-w-2xl rounded-2xl border bg-card p-6 text-center sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-3 text-3xl font-semibold">Äänestys ei ole käynnissä.</h2>
        <p className="mx-auto mb-6 max-w-lg text-muted-foreground">
          Kun uusi äänestys alkaa, voit saada siitä ilmoituksen. Ilman push-ilmoituksia äänestystilanne voidaan näyttää etusivulla, kun avaat Ryhämviisut-sovelluksen seuraavan kerran.
        </p>

        {enabled ? (
          <div className="flex flex-col items-center gap-3">
            <p className="flex items-center gap-2 font-medium text-primary"><BellRing className="h-5 w-5" /> Ilmoituslupa on annettu</p>
            <Button variant="outline" onClick={disableNotifications}>Poista ilmoitustoive</Button>
          </div>
        ) : (
          <Button onClick={subscribe} className="gap-2">
            <Bell className="h-4 w-4" />
            Ilmoita minulle, kun äänestyksiä avautuu
          </Button>
        )}

        {message && (
          <p role="status" className="mx-auto mt-5 max-w-lg text-sm text-muted-foreground">{message}</p>
        )}

        <p className="mx-auto mt-6 flex max-w-lg items-start gap-2 text-left text-xs text-muted-foreground">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Selaimen lupa ei yksin riitä taustalla saapuviin push-ilmoituksiin. Niitä varten tarvitaan vielä palvelinpuolen ilmoituspalvelu.
        </p>
      </section>
    </PageShell>
  );
}
