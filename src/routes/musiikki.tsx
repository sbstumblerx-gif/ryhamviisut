import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/musiikki")({
  head: () => ({
    meta: [
      { title: "Musiikki – Ryhmäviisut" },
      { name: "description", content: "Ryhmäviisut: Musiikki" },
      { property: "og:title", content: "Musiikki – Ryhmäviisut" },
      { property: "og:description", content: "Ryhmäviisut: Musiikki" },
    ],
  }),
  component: () => (
    <PageShell title="Musiikki">
      <ComingSoon />
    </PageShell>
  ),
});
