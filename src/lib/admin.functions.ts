import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { announcementInput } from "./announcements";

const sectionType = z.enum(["artistijulkistus", "esittely", "karsinta", "finaali"]);
const id = z.string().uuid();
const youtubeUrl = z.string().trim().max(500).nullable();

const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("verify") }),
  z.object({ type: z.literal("listLinkablePeople") }),
  z.object({ type: z.literal("linkPeople"), firstType: z.enum(["artist", "jury"]), firstName: z.string().trim().min(1).max(200), secondType: z.enum(["artist", "jury"]), secondName: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal("saveAnnouncement"), id: id.optional(), title: announcementInput.shape.title, content: announcementInput.shape.content }),
  z.object({ type: z.literal("deleteAnnouncement"), id }),
  z.object({ type: z.literal("createAnnouncementUpload"), path: z.string().regex(/^[a-f0-9-]+\.(png|jpg|webp|gif)$/), contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]) }),
  z.object({ type: z.literal("getAnnouncementImageUrl"), path: z.string().regex(/^[a-f0-9-]+\.(png|jpg|webp|gif)$/) }),
  z.object({ type: z.literal("listApplications") }),
  z.object({ type: z.literal("replyApplication"), id, reply: z.string().trim().min(1).max(10000) }),
  z.object({ type: z.literal("listVotingEntries") }),
  z.object({ type: z.literal("createVotingPoll"), title: z.string().trim().min(1).max(200), entryIds: z.array(id).min(2).max(100) }),
  z.object({ type: z.literal("startVotingPoll"), pollId: id }),
  z.object({ type: z.literal("closeVotingPoll"), pollId: id }),
  z.object({ type: z.literal("getVotingData") }),
  z.object({ type: z.literal("calculateVotingPoints"), pollId: id, totalPoints: z.number().int().min(0).max(1000000) }),

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
    video_url: youtubeUrl.optional(),
  }),
  z.object({
    type: z.literal("updateEntry"),
    id,
    artist: z.string().trim().min(1).max(200).optional(),
    song: z.string().trim().max(200).nullable().optional(),
    video_url: youtubeUrl.optional(),
    audience_points: z.number().int().min(0).max(100000).optional(),
    status: z.enum(["eteni", "karsiutui"]).nullable().optional(),
  }),
  z.object({ type: z.literal("deleteEntry"), id }),
  z.object({ type: z.literal("addJury"), section_id: id, name: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal("setArtistDescription"), slug: z.string().trim().min(1).max(200), description: z.string().trim().max(5000).nullable() }),
  z.object({ type: z.literal("deleteJury"), id }),
  z.object({
    type: z.literal("setJuryVotes"),
    jury_id: id,
    votes: z.array(z.object({ entry_id: id, rank: z.number().int().min(1), points: z.number().int().min(0).max(100000) })).max(200),
  }),
]);

export type AdminActionInput = z.infer<typeof action>;

export const adminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => action.parse(d))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Tarvitset ylläpito-oikeuden.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const a = data;
    const check = (r: { error: { message: string } | null }) => {
      if (r.error) throw new Error(r.error.message);
    };
    switch (a.type) {
      case "verify":
        break;
      case "listLinkablePeople": {
        const [{ data: entries, error: entryError }, { data: juries, error: juryError }, { data: links, error: linkError }] = await Promise.all([
          db.from("entries").select("artist, sections!inner(competitions!inner(year))"),
          db.from("juries").select("name, sections!inner(competitions!inner(year))"),
          db.from("person_links").select("person_id, entity_type, entity_key, entity_name"),
        ]);
        if (entryError) throw new Error(entryError.message);
        if (juryError) throw new Error(juryError.message);
        if (linkError) throw new Error(linkError.message);
        const people = new Map<string, any>();
        for (const row of entries ?? []) {
          const name = String(row.artist ?? "").trim(); if (!name) continue;
          const key = name.toLocaleLowerCase("fi-FI"), id = "artist:" + key;
          const year = row.sections?.competitions?.year ?? 0, old = people.get(id);
          if (!old || year > old.year) people.set(id, { type: "artist", name, year });
        }
        for (const row of juries ?? []) {
          const name = String(row.name ?? "").trim(); if (!name) continue;
          const key = name.toLocaleLowerCase("fi-FI"), id = "jury:" + key;
          const year = row.sections?.competitions?.year ?? 0, old = people.get(id);
          if (!old || year > old.year) people.set(id, { type: "jury", name, year });
        }
        const linked = new Map((links ?? []).map((x: any) => [x.entity_type + ":" + x.entity_key, x.person_id]));
        return { ok: true, people: [...people.entries()].map(([id, person]) => ({ id, ...person, personId: linked.get(id) ?? null })) };
      }
      case "linkPeople": {
        const norm = (s: string) => s.trim().toLocaleLowerCase("fi-FI");
        const firstKey = norm(a.firstName), secondKey = norm(a.secondName);
        if (a.firstType === a.secondType && firstKey === secondKey) throw new Error("Valitse kaksi eri henkilöä.");
        const keys = [
          { type: a.firstType, key: firstKey, name: a.firstName.trim() },
          { type: a.secondType, key: secondKey, name: a.secondName.trim() },
        ];
        const { data: existing, error } = await db.from("person_links").select("person_id, entity_type, entity_key");
        if (error) throw new Error(error.message);
        const selected = (existing ?? []).filter((x: any) => keys.some(k => k.type === x.entity_type && k.key === x.entity_key));
        const ids = [...new Set(selected.map((x: any) => x.person_id))];
        const personId = ids[0] ?? crypto.randomUUID();
        for (const oldId of ids.slice(1)) {
          const { error: mergeError } = await db.from("person_links").update({ person_id: personId }).eq("person_id", oldId);
          if (mergeError) throw new Error(mergeError.message);
        }
        const { error: upsertError } = await db.from("person_links").upsert(keys.map(x => ({ person_id: personId, entity_type: x.type, entity_key: x.key, entity_name: x.name })), { onConflict: "entity_type,entity_key" });
        if (upsertError) throw new Error(upsertError.message);
        return { ok: true };
      }
      case "saveAnnouncement": {
        const patch = { title: a.title, content: a.content, updated_at: new Date().toISOString() };
        if (a.id) check(await db.from("announcements").update(patch).eq("id", a.id));
        else check(await db.from("announcements").insert({ ...patch, created_by: context.userId }));
        break;
      }
      case "deleteAnnouncement": {
        check(await db.from("announcements").delete().eq("id", a.id));
        break;
      }
      case "createAnnouncementUpload": {
        const { data, error } = await db.storage.from("announcement-images").createSignedUploadUrl(a.path);
        if (error || !data?.token) throw new Error("Kuvan latauslinkin luominen epäonnistui.");
        return { ok: true, token: data.token };
      }
      case "getAnnouncementImageUrl": {
        const { data, error } = await db.storage.from("announcement-images").createSignedUrl(a.path, 3600);
        if (error || !data?.signedUrl) throw new Error("Kuvan esikatselulinkin luominen epäonnistui.");
        return { ok: true, signedUrl: data.signedUrl };
      }
      case "listApplications": {
        const { data, error } = await db.from("applications").select("id, application_type, applicant_name, contact_email, payload, admin_reply, replied_at, created_at").order("created_at", { ascending: false }).limit(200);
        if (error) throw new Error(error.message);
        return { ok: true, applications: data ?? [] };
      }
      case "replyApplication": {
        check(await db.from("applications").update({ admin_reply: a.reply, replied_at: new Date().toISOString() }).eq("id", a.id));
        break;
      }
      case "listVotingEntries": {
        const { data, error } = await db.from("entries").select("id, artist, song, sections!inner(type, competitions!inner(year))").not("song", "is", null).order("artist");
        if (error) throw new Error(error.message);
        return { ok: true, entries: (data ?? []).map((e: any) => ({ id: e.id, artist: e.artist, song: e.song, year: e.sections?.competitions?.year ?? null })) };
      }
      case "createVotingPoll": {
        const { data: entries, error: ee } = await db.from("entries").select("id, artist, song").in("id", a.entryIds);
        if (ee) throw new Error(ee.message);
        if (!entries || entries.length !== new Set(a.entryIds).size) throw new Error("Kappaleita ei löytynyt.");
        const { data: poll, error } = await db.from("voting_polls").insert({ title: a.title, status: "draft" }).select("id").single();
        if (error) throw new Error(error.message);
        const { error: oe } = await db.from("voting_options").insert(entries.map((e: any) => ({ poll_id: poll.id, entry_id: e.id, artist: e.artist, song: e.song })));
        if (oe) { await db.from("voting_polls").delete().eq("id", poll.id); throw new Error(oe.message); }
        return { ok: true, pollId: poll.id };
      }
      case "startVotingPoll": {
        const { count, error: ce } = await db.from("voting_options").select("id", { count: "exact", head: true }).eq("poll_id", a.pollId);
        if (ce) throw new Error(ce.message);
        if (!count || count < 2) throw new Error("Äänestykseen tarvitaan vähintään kaksi kappaletta.");
        const { data: poll, error } = await db.from("voting_polls").select("status").eq("id", a.pollId).single();
        if (error) throw new Error(error.message);
        if (poll.status !== "draft") throw new Error("Vain luonnos voidaan aloittaa.");
        const { count: activeCount, error: activeError } = await db.from("voting_polls").select("id", { count: "exact", head: true }).eq("status", "active");
        if (activeError) throw new Error(activeError.message);
        if ((activeCount ?? 0) > 0) throw new Error("Sulje ensin käynnissä oleva äänestys.");
        check(await db.from("voting_polls").update({ status: "active", started_at: new Date().toISOString() }).eq("id", a.pollId));
        break;
      }
      case "closeVotingPoll": {
        const { data: poll, error } = await db.from("voting_polls").select("status").eq("id", a.pollId).single();
        if (error) throw new Error(error.message);
        if (poll.status !== "active") throw new Error("Äänestys ei ole käynnissä.");
        check(await db.from("voting_polls").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", a.pollId));
        break;
      }
      case "getVotingData": {
        const { data: polls, error } = await db.from("voting_polls").select("*").order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        const result = [];
        for (const poll of polls ?? []) {
          const { data: opts, error: oe } = await db.from("voting_options").select("*").eq("poll_id", poll.id).order("created_at");
          if (oe) throw new Error(oe.message);
          const { data: ballots, error: be } = await db.from("voting_ballots").select("option_id").eq("poll_id", poll.id);
          if (be) throw new Error(be.message);
          const total = (ballots ?? []).length;
          const counts = new Map<string, number>();
          for (const b of ballots ?? []) counts.set(b.option_id, (counts.get(b.option_id) ?? 0) + 1);
          result.push({ ...poll, totalVotes: total, options: (opts ?? []).map((o: any) => ({ ...o, votes: counts.get(o.id) ?? 0, percent: total ? ((counts.get(o.id) ?? 0) / total) * 100 : 0 })) });
        }
        return { ok: true, polls: result };
      }
      case "calculateVotingPoints": {
        const { data: poll, error } = await db.from("voting_polls").select("status, points_calculated").eq("id", a.pollId).single();
        if (error) throw new Error(error.message);
        if (poll.status !== "closed") throw new Error("Sulje äänestys ennen pisteiden laskemista.");
        if (poll.points_calculated) throw new Error("Pisteet on jo laskettu.");
        const { data: opts, error: oe } = await db.from("voting_options").select("id").eq("poll_id", a.pollId);
        if (oe) throw new Error(oe.message);
        const { data: ballots, error: be } = await db.from("voting_ballots").select("option_id").eq("poll_id", a.pollId);
        if (be) throw new Error(be.message);
        const total = (ballots ?? []).length;
        const counts = new Map<string, number>();
        for (const b of ballots ?? []) counts.set(b.option_id, (counts.get(b.option_id) ?? 0) + 1);
        for (const o of opts ?? []) {
          const points = total ? Math.round(((counts.get(o.id) ?? 0) / total) * a.totalPoints) : 0;
          check(await db.from("voting_options").update({ audience_points: points }).eq("id", o.id));
        }
        check(await db.from("voting_polls").update({ total_audience_points: a.totalPoints, points_calculated: true }).eq("id", a.pollId));
        break;
      }
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
        check(await db.from("entries").insert({ section_id: a.section_id, artist: a.artist, song: a.song || null, video_url: a.video_url || null }));
        break;
      case "updateEntry": {
        const patch: { artist?: string; song?: string | null; video_url?: string | null; audience_points?: number; status?: string | null } = {};
        if (a.artist !== undefined) patch.artist = a.artist;
        if (a.song !== undefined) patch.song = a.song;
        if (a.video_url !== undefined) patch.video_url = a.video_url;
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
      case "setArtistDescription": {
        if (a.description) {
          check(await db.from("artist_profiles").upsert({ slug: a.slug, description: a.description, updated_at: new Date().toISOString() }));
        } else {
          check(await db.from("artist_profiles").delete().eq("slug", a.slug));
        }
        break;
      }
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
