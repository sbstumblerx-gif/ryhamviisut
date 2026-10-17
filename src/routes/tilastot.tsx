import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/tilastot")({
  head: () => ({
    meta: [
      { title: "Tilastot – Ryhmäviisut" },
      { name: "description", content: "Ryhmäviisut: Tilastot" },
      { property: "og:title", content: "Tilastot – Ryhmäviisut" },
      { property: "og:description", content: "Ryhmäviisut: Tilastot" },
    ],
  }),
  component: () => (
    <PageShell title="Tilastot">
      <ComingSoon />
    </PageShell>
  ),
});
