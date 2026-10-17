import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uuid = z.string().uuid();

export const getPublicVotingPoll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ accessToken: z.string().min(1).max(4096) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: auth, error: authError } = await db.auth.getUser(data.accessToken);
    if (authError || !auth.user) throw new Error("Kirjaudu sisään nähdäksesi ja äänestääksesi.");
    const client = db as any;
    const { data: poll, error } = await client.from("voting_polls").select("id, title, status").eq("status", "active").order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!poll) return null;
    const { data: options, error: optionsError } = await client.from("voting_options").select("id, artist, song").eq("poll_id", poll.id).order("created_at");
    if (optionsError) throw new Error(optionsError.message);
    const { data: existing, error: voteError } = await client.from("voting_ballots").select("id").eq("poll_id", poll.id).eq("user_id", auth.user.id).maybeSingle();
    if (voteError) throw new Error(voteError.message);
    return { ...poll, options, hasVoted: !!existing };
  });

export const castVotingBallot = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ accessToken: z.string().min(1).max(4096), pollId: uuid, optionId: uuid }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: auth, error: authError } = await db.auth.getUser(data.accessToken);
    if (authError || !auth.user) throw new Error("Kirjaudu sisään ennen äänestämistä.");
    const client = db as any;
    const { data: poll, error: pollError } = await client.from("voting_polls").select("status").eq("id", data.pollId).maybeSingle();
    if (pollError || poll?.status !== "active") throw new Error("Äänestys on suljettu.");
    const { data: option, error: optionError } = await client.from("voting_options").select("id").eq("id", data.optionId).eq("poll_id", data.pollId).maybeSingle();
    if (optionError || !option) throw new Error("Valitse kelvollinen äänestyskohde.");
    const { error } = await client.from("voting_ballots").insert({ poll_id: data.pollId, option_id: data.optionId, user_id: auth.user.id });
    if (error?.code === "23505") throw new Error("Olet jo äänestänyt tässä äänestyksessä.");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
