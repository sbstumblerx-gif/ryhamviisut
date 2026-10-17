import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/lib/admin";

export const Route = createFileRoute("/asetukset")({
  head: () => ({
    meta: [
      { title: "Asetukset – Ryhmäviisut" },
      { name: "description", content: "Ryhmäviisujen asetukset." },
      { property: "og:title", content: "Asetukset – Ryhmäviisut" },
      { property: "og:description", content: "Ryhmäviisujen asetukset." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { isAdmin, login, logout } = useAdmin();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <PageShell title="Asetukset">
      <div className="tile max-w-md p-6 hover:transform-none">
        {isAdmin ? (
          <div className="space-y-4">
            <p className="text-success">Olet kirjautunut adminina.</p>
            <Button variant="secondary" onClick={logout}>Kirjaudu ulos</Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await login(code);
                toast.success("Admin-tila päällä");
                setCode("");
              } catch {
                toast.error("Väärä koodi");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="text-sm text-muted-foreground">Koodi</label>
            <Input type="password" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button type="submit" disabled={busy || !code}>Vahvista</Button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
