import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/osallistu")({
  head: () => ({
    meta: [
      { title: "Osallistu – Ryhämviisut" },
      { name: "description", content: "Ryhämviisut: Osallistu" },
      { property: "og:title", content: "Osallistu – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisut: Osallistu" },
    ],
  }),
  component: () => (
    <PageShell title="Osallistu">
      <ComingSoon />
    </PageShell>
  ),
});
