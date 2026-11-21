import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const profileInput = z.object({
  slug: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable(),
  bannerPath: z.string().regex(/^[a-z0-9-]+\/[a-f0-9-]+\.webp$/).nullable(),
});

export const saveArtistProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: permissionError } = await context.supabase.rpc("is_verified_artist", {
      _user_id: context.userId,
      _slug: data.slug,
    });
    const { data: adminAllowed } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (permissionError || (!allowed && !adminAllowed)) throw new Error("Sinulla ei ole tämän artistin muokkausoikeutta.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const patch = {
      slug: data.slug,
      description: data.description || null,
      banner_path: data.bannerPath,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from("artist_profiles").upsert(patch, { onConflict: "slug" });
    if (error) throw new Error("Artistiprofiilin tallentaminen epäonnistui.");
    return { ok: true };
  });
