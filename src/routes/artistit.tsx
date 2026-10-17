import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/artistit")({
  head: () => ({
    meta: [
      { title: "Artistit – Ryhmäviisut" },
      { name: "description", content: "Ryhmäviisut: Artistit" },
      { property: "og:title", content: "Artistit – Ryhmäviisut" },
      { property: "og:description", content: "Ryhmäviisut: Artistit" },
    ],
  }),
  component: () => (
    <PageShell title="Artistit">
      <ComingSoon />
    </PageShell>
  ),
});
