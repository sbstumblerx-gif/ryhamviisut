import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkSupporter } from "@/lib/supporter.functions";
import { appearanceChoices } from "@/lib/supporter-plan";

type Appearance = { palette: "original" | "mint" | "rose"; badge: "star" | "heart" | "crown"; backdrop: boolean };
const defaults: Appearance = { palette: "original", badge: "star", backdrop: true };

function useSupporterState() {
  const { data: session } = useQuery({ queryKey: ["auth-session"], queryFn: async () => (await supabase.auth.getSession()).data.session, staleTime: 60000 });
  const verify = useServerFn(checkSupporter);
  const query = useQuery({ queryKey: ["supporter", session?.user.id], queryFn: () => verify(), enabled: Boolean(session),
    staleTime: 60000, refetchInterval: session ? 60000 : false, retry: 1 });
  const subscribed = Boolean(session && !query.isError && query.data?.subscribed);
  const [appearance, setAppearance] = useState<Appearance>(defaults);
  const userId = session?.user.id;

  useEffect(() => {
    setAppearance(defaults);
    if (!userId) return;
    try {
      const raw = JSON.parse(localStorage.getItem(`ryham-appearance-${userId}`) ?? "null");
      if (!raw) return;
      setAppearance({
        palette: appearanceChoices.palettes.includes(raw.palette) ? raw.palette : "original",
        badge: appearanceChoices.badges.includes(raw.badge) ? raw.badge : "star",
        backdrop: typeof raw.backdrop === "boolean" ? raw.backdrop : true,
      });
    } catch { /* Invalid cosmetic preferences never grant supporter access. */ }
  }, [userId]);

  useEffect(() => {
    document.documentElement.dataset["supporterPalette"] = subscribed ? appearance.palette : "original";
    document.body.dataset["supporterBackdrop"] = subscribed && !appearance.backdrop ? "off" : "on";
    return () => {
      delete document.documentElement.dataset["supporterPalette"];
      delete document.body.dataset["supporterBackdrop"];
    };
  }, [subscribed, appearance]);

  function updateAppearance(patch: Partial<Appearance>) {
    if (!subscribed || !userId) return;
    const next = { ...appearance, ...patch };
    setAppearance(next);
    try { localStorage.setItem(`ryham-appearance-${userId}`, JSON.stringify(next)); } catch { /* Browser storage may be disabled. */ }
  }

  return { subscribed, userId, isSignedIn: Boolean(session), appearance, updateAppearance,
    status: query.data, loading: Boolean(session) && query.isPending, error: query.error, refresh: query.refetch };
}

const SupporterContext = createContext<ReturnType<typeof useSupporterState> | null>(null);
export function SupporterProvider({ children }: { children: ReactNode }) {
  return <SupporterContext.Provider value={useSupporterState()}>{children}</SupporterContext.Provider>;
}
export function useSupporter() {
  const value = useContext(SupporterContext);
  if (!value) throw new Error("SupporterProvider is missing.");
  return value;
}