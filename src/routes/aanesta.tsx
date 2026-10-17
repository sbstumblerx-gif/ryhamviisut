import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/PageShell";

export const Route = createFileRoute("/aanesta")({
  head: () => ({
    meta: [
      { title: "Äänestä – Ryhmäviisut" },
      { name: "description", content: "Ryhmäviisut: Äänestä" },
      { property: "og:title", content: "Äänestä – Ryhmäviisut" },
      { property: "og:description", content: "Ryhmäviisut: Äänestä" },
    ],
  }),
  component: () => (
    <PageShell title="Äänestä">
      <ComingSoon />
    </PageShell>
  ),
});
