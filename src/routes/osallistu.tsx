import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Mic2, Music2 } from "lucide-react";
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
      "Onko sinulla kappale, artisti tai musiikillinen idea, jonka haluaisit tuoda Ryhämviisuihin? Hae kilpailijaksi.",
    details: [
      "Ilmoita kilpailuun oma kappaleesi tai esityksesi.",
      "Anna kappaleen ja artistin tiedot hakemuksessa.",
      "Varmista, että kilpailuesitys täyttää kilpailun säännöt.",
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

function ParticipatePage() {
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
          </section>
        ))}
      </div>
    </PageShell>
  );
}
