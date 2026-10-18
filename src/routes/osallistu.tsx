import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Mic2, Music2, CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/osallistu")({
  head: () => ({
    meta: [
      { title: "Osallistu – Ryhämviisut" },
      {
        name: "description",
        content: "Hae Ryhämviisujen raadiksi, kilpailijaksi tai väliesityksen tekijäksi.",
      },
      { property: "og:title", content: "Osallistu – Ryhämviisut" },
      {
        property: "og:description",
        content: "Hae Ryhämviisujen raadiksi, kilpailijaksi tai väliesityksen tekijäksi.",
      },
    ],
  }),
  component: ParticipatePage,
});

const opportunities = [
  {
    title: "Raatihakemus",
    icon: ClipboardList,
    description:
      "Haluatko päästä arvioimaan kilpailukappaleita ja vaikuttamaan tuloksiin? Hae mukaan Ryhämviisujen raadiksi.",
    details: [
      "Kuuntele kilpailukappaleet huolellisesti.",
      "Arvioi esitykset kilpailun sääntöjen mukaan.",
      "Anna pisteesi puolueettomasti ja perustellusti.",
    ],
  },
  {
    title: "Kilpailijahakemus",
    icon: Music2,
    description:
      "Hae kilpailijaksi lukemalla ensin osallistujan säännöt ja täyttämällä sen jälkeen hakemus.",
    details: [
      "Tutustu osallistujan sääntöihin (vähintään 40 sekuntia).",
      "Vastaa hakemuksen kysymyksiin.",
      "Varmista, että esityksesi täyttää säännöt.",
    ],
  },
  {
    title: "Väliesityshakemus",
    icon: Mic2,
    description:
      "Haluatko esiintyä Ryhämviisujen väliohjelmassa? Voit ehdottaa musiikki-, viihde- tai muuta sopivaa esitystä.",
    details: [
      "Kerro, millaisen esityksen haluaisit toteuttaa.",
      "Kuvaile esityksen kestoa ja tarvittavaa tekniikkaa.",
      "Kerro, osallistutko yksin vai ryhmän kanssa.",
    ],
  },
] as const;

const rules = [
  "Kappaleessa täytyy olla vähintään 60 sekuntia ja korkeintaan 180 sekuntia aktiivista soittoa tai laulamista. Hiljaisia/tyhjiä kohtia ei lasketa, mutta ne eivät saa silti tehdä musiikkivideosta tai esityksestä yli kolmen minuutin pituista.",
  "Musiikkivideo, esitys tai kappale ei saa mainita, näyttää tai viitata ihannoiden väkivaltaan, rikollisuuteen, syömishäiriöihin, seksuaaliseen sisältöön tai päihderiippuvuuksiin. Joissain tapauksissa voimme kuitenkin tehdä poikkeuksen. Sovi asiasta Ryhämin Discord-käyttäjän kanssa (@weareryham).",
  "Musiikkivideossa tulee olla vähintään 75 % kestosta jotain niin sanottua oikeaa sisältöä. Yli 25 % ajasta ei saa olla esimerkiksi mustaa, valkoista tai muuta yksiväristä, vilkkuvia värejä tai muuta low effort -tyylistä sisältöä. Tämä sääntö on tulkinnanvarainen, joten käytä maalaisjärkeä.",
  "Osallistujalla on velvollisuus osallistua omalla äänellään haastatteluihin, postikorttiinsa ja kaikkiin Ryhämin määräämiin osioihin. Kappaleessa ei ole pakko laulaa.",
  "Alaikäisillä osallistujilla tulee olla huoltajan tieto ja suostumus osallistumiseen. Ryhäm ei ota vastuuta tämän toteutumisesta, vaan edellyttää asian valvontaa perheiltä. Kappaleet ja kilpailulähetykset taltioidaan ja julkaistaan YouTubeen ja mahdollisesti muille alustoille kaikkien nähtäville.",
  "Tekoälyn käyttö laulussa on kielletty. Tekoälyä saa käyttää vain taustamusiikin tekemiseen. Musiikkivideossa osa sisällöstä saa olla tekoälyllä tehtyä, mutta tekoälyn tekemiä visuaalisia elementtejä ei saa olla yli 50 % videon kestosta.",
  "Kaikki musiikin tekoon osallistuneet tulee mainita: mahdollisen taustamusiikin tekijä ja lähde, sanoitus, sävellys (jos itse tehty musiikki), soittajat (jos itse soitettua) ja kaikki laulavat artistit. Esimerkiksi perheenjäsenen pientä apua sanojen keksimisessä ei tarvitse mainita.",
  "Osallistujat ottavat vastuun siitä, ettei mikään heidän kappaleensa sisällöstä ole tekijänoikeudella suojattua.",
] as const;

function ParticipatePage() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(40);
  const [form, setForm] = useState({
    name: "",
    artistName: "",
    songTitle: "",
    songLink: "",
    activeDuration: "",
    credits: "",
    description: "",
    guardianConsent: "",
    rulesAccepted: false,
  });

  useEffect(() => {
    if (!rulesOpen || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rulesOpen, secondsLeft]);

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <PageShell title="Osallistu">
      <div className="mb-8 max-w-2xl space-y-3">
        <p className="text-lg text-muted-foreground">
          Tule mukaan tekemään Ryhämviisuja! Valitse alta itsellesi sopiva tapa osallistua.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {opportunities.map(({ title, icon: Icon, description, details }) => (
          <section
            key={title}
            className="tile space-y-4 p-6 hover:transform-none"
            aria-labelledby={title}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 id={title} className="text-2xl font-semibold">
                {title}
              </h2>
            </div>
            <p className="text-muted-foreground">{description}</p>
            <ul className="list-inside list-disc space-y-2 text-sm">
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
            {title === "Kilpailijahakemus" && (
              <button
                type="button"
                onClick={() => {
                  setSecondsLeft(40);
                  setRulesOpen(true);
                }}
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Avaa kilpailijahakemus
              </button>
            )}
          </section>
        ))}
      </div>

      {rulesOpen && (
        <section className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-8" aria-labelledby="competition-rules-title">
          <div>
            <h2 id="competition-rules-title" className="text-3xl font-semibold">Osallistujan säännöt</h2>
            <p className="mt-2 text-muted-foreground">Lue kaikki säännöt. Jatka hakemukseen vasta, kun 40 sekuntia on kulunut.</p>
          </div>
          <ol className="list-decimal space-y-4 pl-5">
            {rules.map((rule, index) => <li key={index} className="pl-1 leading-relaxed">{rule}</li>)}
          </ol>
          <p className="rounded-lg bg-muted p-4 leading-relaxed">
            Nämä säännöt koskevat kaikkia kilpailijoita tasapuolisesti kilpailumenestyksestä, historiasta tai Ryhäm-jäsenyydestä huolimatta. Rikkominen voi johtaa varoituksista aina viiden vuoden kilpailukieltoon asti. Rikkeiden aiheuttamista rangaistuksista päätetään Ryhäm-jäsenten kokouksessa.
          </p>
          <div className="flex flex-col items-start gap-3 border-t border-border pt-5">
            {secondsLeft > 0 ? (
              <p className="inline-flex items-center gap-2 text-muted-foreground" role="status">
                <Clock3 className="h-5 w-5" /> Lue säännöt rauhassa. Jatka hakemukseen {secondsLeft} sekunnin kuluttua.
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-5 w-5" /> Säännöt on luettu.</p>
            )}
            <button
              type="button"
              disabled={secondsLeft > 0}
              onClick={() => setRulesOpen(false)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Jatka hakemukseen{secondsLeft > 0 ? ` (${secondsLeft} s)` : ""}
            </button>
          </div>
        </section>
      )}

      {!rulesOpen && secondsLeft === 0 && (
        <section className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-8" aria-labelledby="competition-form-title">
          <h2 id="competition-form-title" className="text-3xl font-semibold">Kilpailijahakemus</h2>
          <p className="text-muted-foreground">Täytä alla olevat tiedot huolellisesti. Hakemuksen lähettäminen ei vielä takaa osallistumispaikkaa.</p>
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); window.alert("Hakemusta ei ole vielä lähetetty: verkkosivulle ei ole kytketty hakemusten vastaanottoa. Kopioi vastauksesi talteen ennen sivulta poistumista."); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">Oma nimi / nimimerkki
                <input required value={form.name} onChange={(event) => updateField("name", event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
              </label>
              <label className="space-y-2 text-sm font-medium">Artistinimi
                <input required value={form.artistName} onChange={(event) => updateField("artistName", event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
              </label>
            </div>
            <label className="block space-y-2 text-sm font-medium">Kappaleen nimi
              <input required value={form.songTitle} onChange={(event) => updateField("songTitle", event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
            </label>
            <label className="block space-y-2 text-sm font-medium">Linkki kappaleeseen tai musiikkivideoon
              <input required type="url" placeholder="https://..." value={form.songLink} onChange={(event) => updateField("songLink", event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
            </label>
            <label className="block space-y-2 text-sm font-medium">Aktiivisen musiikin kesto (sekunteina)
              <input required type="number" min="60" max="180" value={form.activeDuration} onChange={(event) => updateField("activeDuration", event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
            </label>
            <label className="block space-y-2 text-sm font-medium">Tekijät ja lähteet (sanoitus, sävellys, taustamusiikki, soittajat ja laulajat)
              <textarea required rows={3} value={form.credits} onChange={(event) => updateField("credits", event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
            </label>
            <label className="block space-y-2 text-sm font-medium">Kuvaile kappaletta, musiikkivideota ja mahdollista tekoälyn käyttöä
              <textarea required rows={4} value={form.description} onChange={(event) => updateField("description", event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base" />
            </label>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Jos olet alaikäinen, onko huoltajasi tietoinen osallistumisesta ja suostuuko hän siihen?</legend>
              <label className="flex items-center gap-2 text-sm"><input required type="radio" name="guardianConsent" value="Kyllä" checked={form.guardianConsent === "Kyllä"} onChange={(event) => updateField("guardianConsent", event.target.value)} /> Kyllä</label>
              <label className="flex items-center gap-2 text-sm"><input required type="radio" name="guardianConsent" value="Ei / en ole alaikäinen" checked={form.guardianConsent === "Ei / en ole alaikäinen"} onChange={(event) => updateField("guardianConsent", event.target.value)} /> Ei / en ole alaikäinen</label>
            </fieldset>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input required type="checkbox" checked={form.rulesAccepted} onChange={(event) => updateField("rulesAccepted", event.target.checked)} className="mt-1" />
              Vakuutan lukeneeni säännöt, hyväksyväni ne ja ymmärtäväni, että kappale sekä kilpailulähetys voidaan julkaista julkisesti.
            </label>
            <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">Tarkista hakemus</button>
            <p className="text-sm text-muted-foreground">Huomio: hakemusten lähetys ei ole vielä kytketty vastaanottavaan järjestelmään. Tämä lomake ei lähetä tietoja Ryhämille.</p>
          </form>
        </section>
      )}
    </PageShell>
  );
}
