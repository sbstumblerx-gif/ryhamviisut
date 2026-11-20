import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { artistSlug, normalizeEmail } from "./artist-slug";

const GENERIC_FAIL = "Hakemusta ei voitu lähettää. Ota tarvittaessa yhteyttä ylläpitoon.";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

/** Verified email from the auth server, never from the browser. */
async function verifiedGoogleEmail(db: any, userId: string) {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  const u = data.user;
  const hasGoogle = (u.identities ?? []).some((i: any) => i.provider === "google") || u.app_metadata?.provider === "google"
    || (u.app_metadata?.providers ?? []).includes("google");
  if (!u.email || !u.email_confirmed_at || !hasGoogle) return null;
  return normalizeEmail(u.email);
}

async function artistOptions(db: any) {
  const { data, error } = await db.from("entries").select("artist").limit(5000);
  if (error) throw new Error("Artistilistaa ei voitu ladata.");
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const name = row.artist?.trim();
    if (name && !map.has(artistSlug(name))) map.set(artistSlug(name), name);
  }
  return [...map.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "fi"));
}

export const getMyArtistStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const email = await verifiedGoogleEmail(db, context.userId);
    const { data } = await db.from("artist_claims").select("id, artist_slug, artist_name, status, created_at, decided_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(10);
    return { googleVerified: !!email, claims: (data ?? []) as { id: string; artist_slug: string; artist_name: string; status: string; created_at: string; decided_at: string | null }[], artists: await artistOptions(db) };
  });

export const submitArtistClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const email = await verifiedGoogleEmail(db, context.userId);
    if (!email) throw new Error("Kirjaudu ensin Google-tilillä, jonka sähköposti on vahvistettu.");
    const artist = (await artistOptions(db)).find((a) => a.slug === data.slug);
    if (!artist) throw new Error("Valitse artisti listasta.");
    const { data: blocks } = await db.from("email_blocks").select("scope").eq("email", email);
    if ((blocks ?? []).length) throw new Error(GENERIC_FAIL);
    const { error } = await db.from("artist_claims").insert({ user_id: context.userId, email, artist_slug: artist.slug, artist_name: artist.name });
    if (error) {
      if (error.code === "23505") throw new Error("Sinulla on jo käsittelyssä oleva tai hyväksytty artistihakemus.");
      throw new Error(GENERIC_FAIL);
    }
    return { ok: true };
  });

export const cancelArtistClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: rows, error } = await db.from("artist_claims").update({ status: "cancelled", decided_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", context.userId).eq("status", "pending").select("id");
    if (error || !rows?.length) throw new Error("Hakemusta ei voitu perua.");
    return { ok: true };
  });

const emailAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("list") }),
  z.object({ type: z.literal("decide"), id: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }),
  z.object({ type: z.literal("revoke"), id: z.string().uuid() }),
  z.object({ type: z.literal("block"), email: z.string().trim().email().max(320), scope: z.enum(["app", "artist"]), reason: z.string().trim().max(1000).optional() }),
  z.object({ type: z.literal("unblock"), email: z.string().trim().email().max(320), scope: z.enum(["app", "artist"]) }),
]);
export type EmailAdminAction = z.infer<typeof emailAction>;

async function findUserIdsByEmail(db: any, email: string) {
  const ids: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data.users ?? []) if (u.email && normalizeEmail(u.email) === email) ids.push(u.id);
    if ((data.users ?? []).length < 200) break;
  }
  return ids;
}

export const emailAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emailAction.parse(d))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Tarvitset ylläpito-oikeuden.");
    const db = await admin();
    const log = (action: string, target: string, details: Record<string, unknown> = {}) =>
      db.from("admin_audit_log").insert({ actor: context.userId, action, target, details });
    const setStatus = async (id: string, from: string[], to: string) => {
      const { error } = await db.rpc("admin_set_claim_status", { _claim_id: id, _actor: context.userId, _from: from, _to: to });
      if (error) throw new Error(error.message.includes("blocked") ? "Sähköposti on estolistalla." : error.message.includes("invalid_state") ? "Hakemuksen tila on jo muuttunut." : "Toiminto epäonnistui.");
    };
    switch (data.type) {
      case "list": {
        const [{ data: claims }, { data: blocks }] = await Promise.all([
          db.from("artist_claims").select("*").order("created_at", { ascending: false }).limit(500),
          db.from("email_blocks").select("*").order("created_at", { ascending: false }),
        ]);
        const users: { id: string; email: string; created_at: string; last_sign_in_at: string | null; provider: string | null }[] = [];
        for (let page = 1; page <= 10; page++) {
          const { data: res, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
          if (error) break;
          for (const u of res.users ?? []) if (u.email) users.push({ id: u.id, email: normalizeEmail(u.email), created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null, provider: u.app_metadata?.provider ?? null });
          if ((res.users ?? []).length < 200) break;
        }
        return { claims: claims ?? [], blocks: blocks ?? [], users };
      }
      case "decide":
        await setStatus(data.id, ["pending"], data.decision);
        return { ok: true };
      case "revoke":
        await setStatus(data.id, ["approved"], "revoked");
        return { ok: true };
      case "block": {
        const email = normalizeEmail(data.email);
        const { error } = await db.from("email_blocks").upsert({ email, scope: data.scope, reason: data.reason || null, created_by: context.userId });
        if (error) throw new Error("Estäminen epäonnistui.");
        // Blocked emails lose pending/approved artist claims immediately.
        await db.from("artist_claims").update({ status: "revoked", decided_at: new Date().toISOString(), decided_by: context.userId })
          .eq("email", email).in("status", ["pending", "approved"]);
        if (data.scope === "app") {
          for (const id of await findUserIdsByEmail(db, email)) {
            if (id === context.userId) continue;
            await db.auth.admin.updateUserById(id, { ban_duration: "876000h" });
          }
        }
        await log("email_block", email, { scope: data.scope });
        return { ok: true };
      }
      case "unblock": {
        const email = normalizeEmail(data.email);
        await db.from("email_blocks").delete().eq("email", email).eq("scope", data.scope);
        if (data.scope === "app") for (const id of await findUserIdsByEmail(db, email)) await db.auth.admin.updateUserById(id, { ban_duration: "none" });
        await log("email_unblock", email, { scope: data.scope });
        return { ok: true };
      }
    }
  });
