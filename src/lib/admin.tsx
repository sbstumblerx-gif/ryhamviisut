import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminAction, type AdminActionInput } from "./admin.functions";

export function useAdmin() {
  const qc = useQueryClient();
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
    staleTime: 60000,
  });
  const { data: isAdmin = false, isLoading } = useQuery({
    queryKey: ["is-admin", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      try {
        await adminAction({ data: { type: "verify" } });
        return true;
      } catch {
        return false;
      }
    },
    staleTime: 60000,
  });

  const run = useCallback(
    async (action: AdminActionInput) => {
      const result = await adminAction({ data: action });
      await qc.invalidateQueries();
      return result;
    },
    [qc],
  );

  return { isAdmin, adminLoading: !!session && isLoading, isSignedIn: !!session, run };
}

export function youtubeEmbed(url: string | null | undefined) {
  if (!url?.trim()) return null;

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const isShortDomain = host === "youtu.be";
    const isYoutubeDomain = host === "youtube.com" || host.endsWith(".youtube.com");
    if (!isShortDomain && !isYoutubeDomain) return null;

    let id: string | null = null;
    if (isShortDomain) {
      id = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v");
    } else {
      const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/);
      id = match?.[1] ?? null;
    }

    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
