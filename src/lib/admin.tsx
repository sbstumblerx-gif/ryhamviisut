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
      if (!code) return;
      const result = await adminAction({ data: { code, action } });
      await qc.invalidateQueries();
      return result;
    },
    [code, qc],
  );

  return { isAdmin: !!code, login, logout, run };
}

export function youtubeEmbed(url: string | null | undefined) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
