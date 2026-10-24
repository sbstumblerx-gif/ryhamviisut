import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { announcementInput } from "./announcements";

export const readAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  const db = createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await db.from("announcements").select("id,title,content,created_at,updated_at").order("created_at", { ascending: false });
  if (error) throw new Error("Tiedotteiden lataaminen epäonnistui.");
  const images: Record<string, string> = {};
  for (const row of data ?? []) {
    const content = row.content as { content?: { type: string; attrs?: { src?: string } }[] };
    for (const node of content.content ?? []) {
      if (node.type !== "image" || !node.attrs?.src || images[node.attrs.src]) continue;
      const result = await db.storage.from("announcement-images").createSignedUrl(node.attrs.src, 3600);
      if (result.data) images[node.attrs.src] = result.data.signedUrl;
    }
  }
  return { announcements: data ?? [], images };
});

export const saveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => announcementInput.parse(data))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Tarvitset ylläpito-oikeuden.");
    const patch = { title: data.title, content: data.content, updated_at: new Date().toISOString() };
    const result = data.id
      ? await context.supabase.from("announcements").update(patch).eq("id", data.id).select("id").single()
      : await context.supabase.from("announcements").insert({ ...patch, created_by: context.userId }).select("id").single();
    if (result.error) throw new Error("Tiedotteen tallentaminen epäonnistui.");
    return result.data;
  });
export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Tarvitset ylläpito-oikeuden.");
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error("Poistaminen epäonnistui.");
    return { ok: true };
  });