import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/tilastot")({
  head: () => ({
    meta: [
      { title: "Tilastot – Ryhämviisut" },
      { name: "description", content: "Ryhämviisut: Tilastot" },
      { property: "og:title", content: "Tilastot – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisut: Tilastot" },
    ],
  }),
  component: () => (
    <PageShell title="Tilastot">
      <ComingSoon />
    </PageShell>
  ),
});
