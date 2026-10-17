import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminAction, type AdminActionInput } from "./admin.functions";

const KEY = "rv-admin-code";
const listeners = new Set<() => void>();

export function useAdmin() {
  const [code, setCode] = useState<string | null>(null);
  const qc = useQueryClient();
  useEffect(() => {
    const sync = () => setCode(localStorage.getItem(KEY));
    sync();
    listeners.add(sync);
    return () => void listeners.delete(sync);
  }, []);

  const login = useCallback(async (c: string) => {
    await adminAction({ data: { code: c, action: { type: "verify" } } });
    localStorage.setItem(KEY, c);
    listeners.forEach((l) => l());
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    listeners.forEach((l) => l());
  }, []);

  const run = useCallback(
    async (action: AdminActionInput) => {
      if (!code) throw new Error("Kirjaudu ensin ylläpitäjänä.");
      const result = await adminAction({ data: { code, action } });
      await qc.invalidateQueries();
      return result;
    },
    [code, qc],
  );

  return { isAdmin: !!code, login, logout, run };
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
