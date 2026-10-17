import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Chrome, LogIn, Mail, ShieldCheck, Apple, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Mode = "login" | "signup" | "reset" | "recovery";

export const Route = createFileRoute("/kirjaudu")({
  head: () => ({
    meta: [
      { title: "Kirjaudu – Ryhämviisut" },
      { name: "description", content: "Kirjaudu Ryhämviisuihin sähköpostilla tai ulkoisella tunnuksella." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserEmail(data.session?.user.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUserEmail(session?.user.email ?? null);
      if (event === "PASSWORD_RECOVERY") setMode("recovery");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/kirjaudu` },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Tili luotu ja olet kirjautunut sisään.");
        } else {
          setMessage("Tarkista sähköpostisi ja vahvista osoitteesi ennen kirjautumista.");
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Kirjautuminen onnistui!");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/kirjaudu`,
        });
        if (error) throw error;
        setMessage("Jos osoitteelle löytyy tili, siihen lähetetään salasanan palautuslinkki.");
      } else {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setPassword("");
        setNewPassword("");
        setMode("login");
        toast.success("Salasana vaihdettu.");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Kirjautuminen epäonnistui. Yritä uudelleen.";
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  async function signInWith(provider: "google" | "discord" | "apple") {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/kirjaudu` },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kirjautuminen ei onnistunut.");
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserEmail(null);
      setMode("login");
      toast.success("Olet kirjautunut ulos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Uloskirjautuminen epäonnistui.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Kirjaudu">
      <div className="tile mx-auto max-w-md space-y-5 p-6 hover:transform-none">
        {userEmail && mode !== "recovery" ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="text-xl font-semibold">Olet kirjautunut sisään</h2>
            <p className="break-all text-sm text-muted-foreground">{userEmail}</p>
            <Button className="w-full" variant="outline" disabled={busy} onClick={signOut}>Kirjaudu ulos</Button>
          </div>
        ) : (
          <>
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-semibold">
                {mode === "signup" ? "Luo tili" : mode === "reset" ? "Palauta salasana" : mode === "recovery" ? "Aseta uusi salasana" : "Tervetuloa takaisin"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === "signup" ? "Luo Ryhämviisut-tili sähköpostiosoitteellasi." : mode === "reset" ? "Lähetämme sähköpostiisi palautuslinkin." : mode === "recovery" ? "Valitse tilillesi uusi salasana." : "Kirjaudu sähköpostilla tai valitsemallasi palvelulla."}
              </p>
            </div>

            {mode !== "reset" && mode !== "recovery" && (
              <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => signInWith("google")}>
                  <Chrome /> Jatka Googlella
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => signInWith("discord")}>
                  <MessageCircle /> Jatka Discordilla
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => signInWith("apple")}>
                  <Apple /> Jatka Applella
                </Button>
              </div>
            )}

            {mode !== "recovery" && mode !== "reset" && (
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs uppercase text-muted-foreground">tai sähköpostilla</span></div>
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              {mode !== "recovery" && (
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-sm font-medium">Sähköpostiosoite</label>
                  <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="sinä@example.com" />
                </div>
              )}
              {(mode === "login" || mode === "signup") && (
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-sm font-medium">Salasana</label>
                  <Input id="login-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Vähintään 6 merkkiä" />
                </div>
              )}
              {mode === "recovery" && (
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-sm font-medium">Uusi salasana</label>
                  <Input id="new-password" type="password" autoComplete="new-password" minLength={6} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Vähintään 6 merkkiä" />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "signup" ? "Luo tili" : mode === "reset" ? "Lähetä palautuslinkki" : mode === "recovery" ? "Vaihda salasana" : <><LogIn /> Kirjaudu sähköpostilla</>}
              </Button>
            </form>

            {mode === "login" && (
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <button type="button" className="text-primary hover:underline" onClick={() => { setMode("reset"); setMessage(""); }}>Unohditko salasanan?</button>
                <button type="button" className="text-primary hover:underline" onClick={() => { setMode("signup"); setMessage(""); }}>Luo uusi tili</button>
              </div>
            )}
            {mode === "signup" && (
              <p className="text-center text-sm text-muted-foreground">
                Onko sinulla jo tili?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => { setMode("login"); setMessage(""); }}>Kirjaudu sisään</button>
              </p>
            )}
            {(mode === "reset" || mode === "recovery") && (
              <button type="button" className="w-full text-sm text-primary hover:underline" onClick={() => { setMode("login"); setMessage(""); }}>Takaisin kirjautumiseen</button>
            )}
          </>
        )}
        {message && <p role="status" className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{message}</p>}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Kirjautuminen hoidetaan turvallisesti Supabase Authin kautta. Älä käytä salasanaa, jota käytät muissa tärkeissä palveluissa.
        </p>
      </div>
    </PageShell>
  );
}
