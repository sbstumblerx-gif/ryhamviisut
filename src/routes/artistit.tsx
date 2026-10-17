import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { ArtistLink } from "@/components/ArtistLink";
import { artistDirectoryQuery } from "@/lib/queries";

export const Route = createFileRoute("/artistit")({
  head: () => ({
    meta: [
      { title: "Artistit – Ryhämviisut" },
      { name: "description", content: "Kaikki Ryhämviisuissa kilpailleet artistit." },
      { property: "og:title", content: "Artistit – Ryhämviisut" },
      { property: "og:description", content: "Kaikki Ryhämviisuissa kilpailleet artistit." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistDirectoryQuery),
  component: ArtistsPage,
});

function ArtistsPage() {
  const { data } = useSuspenseQuery(artistDirectoryQuery);

  return (
    <PageShell title="Artistit">
      <p className="mb-5 text-muted-foreground">
        Kaikki artisteiksi lisätyt nimet. Täsmälleen samat nimet yhdistetään samaksi artistiksi. Kilpailumäärä lasketaan eri kilpailuvuosien perusteella.
      </p>
      {data.length === 0 ? (
        <p className="text-muted-foreground">Yhtään artistia ei ole vielä lisätty kilpailuihin.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((artist) => (
            <li key={artist.name.toLocaleLowerCase("fi-FI")} className="tile p-4">
              <ArtistLink name={artist.name} className="font-semibold text-lg text-primary hover:underline" />
              <p className="mt-1 text-sm text-muted-foreground">
                {artist.competitionYears.length} {artist.competitionYears.length === 1 ? "kilpailuvuosi" : "kilpailuvuotta"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
