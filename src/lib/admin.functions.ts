import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sectionType = z.enum(["artistijulkistus", "esittely", "karsinta", "finaali"]);
const id = z.string().uuid();

const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("verify") }),
  z.object({ type: z.literal("addYear"), year: z.number().int().min(1900).max(3000) }),
  z.object({ type: z.literal("deleteYear"), id }),
  z.object({ type: z.literal("addSection"), competition_id: id, section: sectionType }),
  z.object({ type: z.literal("deleteSection"), id }),
  z.object({ type: z.literal("updateSection"), id, video_url: z.string().trim().max(500).nullable() }),
  z.object({
    type: z.literal("addEntry"),
    section_id: id,
    artist: z.string().trim().min(1).max(200),
    song: z.string().trim().max(200).nullable(),
  }),
  z.object({
    type: z.literal("updateEntry"),
    id,
    artist: z.string().trim().min(1).max(200).optional(),
    song: z.string().trim().max(200).nullable().optional(),
    audience_points: z.number().int().min(0).max(100000).optional(),
    status: z.enum(["eteni", "karsiutui"]).nullable().optional(),
  }),
  z.object({ type: z.literal("deleteEntry"), id }),
  z.object({ type: z.literal("addJury"), section_id: id, name: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal("deleteJury"), id }),
  z.object({
    type: z.literal("setJuryVotes"),
    jury_id: id,
    votes: z.array(z.object({ entry_id: id, rank: z.number().int().min(1), points: z.number().int().min(0).max(100000) })).max(200),
  }),
]);

export type AdminActionInput = z.infer<typeof action>;

const input = z.object({ code: z.string().max(200), action });

export const adminAction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    if (data.code !== "Valkkuonsöpö321") throw new Error("Väärä koodi");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const a = data.action;
    const check = (r: { error: { message: string } | null }) => {
      if (r.error) throw new Error(r.error.message);
    };
    switch (a.type) {
      case "verify":
        break;
      case "addYear":
        check(await db.from("competitions").insert({ year: a.year }));
        break;
      case "deleteYear":
        check(await db.from("competitions").delete().eq("id", a.id));
        break;
      case "addSection":
        check(await db.from("sections").insert({ competition_id: a.competition_id, type: a.section }));
        break;
      case "deleteSection":
        check(await db.from("sections").delete().eq("id", a.id));
        break;
      case "updateSection":
        check(await db.from("sections").update({ video_url: a.video_url || null }).eq("id", a.id));
        break;
      case "addEntry":
        check(await db.from("entries").insert({ section_id: a.section_id, artist: a.artist, song: a.song || null }));
        break;
      case "updateEntry": {
        const patch: { artist?: string; song?: string | null; audience_points?: number; status?: string | null } = {};
        if (a.artist !== undefined) patch.artist = a.artist;
        if (a.song !== undefined) patch.song = a.song;
        if (a.audience_points !== undefined) patch.audience_points = a.audience_points;
        if (a.status !== undefined) patch.status = a.status;
        check(await db.from("entries").update(patch).eq("id", a.id));
        break;
      }
      case "deleteEntry":
        check(await db.from("entries").delete().eq("id", a.id));
        break;
      case "addJury":
        check(await db.from("juries").insert({ section_id: a.section_id, name: a.name }));
        break;
      case "deleteJury":
        check(await db.from("juries").delete().eq("id", a.id));
        break;
      case "setJuryVotes":
        check(await db.from("jury_votes").delete().eq("jury_id", a.jury_id));
        if (a.votes.length)
          check(await db.from("jury_votes").insert(a.votes.map((v) => ({ ...v, jury_id: a.jury_id }))));
        break;
    }
    return { ok: true };
  });
