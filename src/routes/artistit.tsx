import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/artistit")({
  head: () => ({
    meta: [
      { title: "Artistit – Ryhämviisut" },
      { name: "description", content: "Ryhämviisut: Artistit" },
      { property: "og:title", content: "Artistit – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisut: Artistit" },
    ],
  }),
  component: () => (
    <PageShell title="Artistit">
      <ComingSoon />
    </PageShell>
  ),
});
