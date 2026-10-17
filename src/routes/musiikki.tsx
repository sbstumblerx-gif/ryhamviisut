import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/musiikki")({
  head: () => ({
    meta: [
      { title: "Musiikki – Ryhämviisut" },
      { name: "description", content: "Ryhämviisut: Musiikki" },
      { property: "og:title", content: "Musiikki – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisut: Musiikki" },
    ],
  }),
  component: () => (
    <PageShell title="Musiikki">
      <ComingSoon />
    </PageShell>
  ),
});
