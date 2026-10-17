import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/aanesta")({
  head: () => ({
    meta: [
      { title: "Äänestä – Ryhämviisut" },
      { name: "description", content: "Ryhämviisut: Äänestä" },
      { property: "og:title", content: "Äänestä – Ryhämviisut" },
      { property: "og:description", content: "Ryhämviisut: Äänestä" },
    ],
  }),
  component: () => (
    <PageShell title="Äänestä">
      <ComingSoon />
    </PageShell>
  ),
});
