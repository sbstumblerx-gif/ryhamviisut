import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/osallistu")({
  head: () => ({
    meta: [
      { title: "Osallistu – Ryhmäviisut" },
      { name: "description", content: "Ryhmäviisut: Osallistu" },
      { property: "og:title", content: "Osallistu – Ryhmäviisut" },
      { property: "og:description", content: "Ryhmäviisut: Osallistu" },
    ],
  }),
  component: () => (
    <PageShell title="Osallistu">
      <ComingSoon />
    </PageShell>
  ),
});
