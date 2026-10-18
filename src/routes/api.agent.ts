import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";

type ChatBody = { threadId?: string; messages?: UIMessage[] };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getServerClient(accessToken: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase-palvelinasetukset puuttuvat.");
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token) return jsonError("Kirjaudu sisään käyttääksesi Agenttia.", 401);

        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return jsonError("Virheellinen pyyntö.", 400);
        }
        if (!body.threadId || !Array.isArray(body.messages) || body.messages.length === 0) {
          return jsonError("Keskustelu tai viestit puuttuvat.", 400);
        }
        if (body.messages.length > 80) return jsonError("Keskustelu on liian pitkä. Aloita uusi keskustelu.", 413);

        const openAIKey = process.env.OPENAI_API_KEY;
        if (!openAIKey) return jsonError("Agentin OpenAI API -avain puuttuu palvelimen asetuksista.", 503);

        let supabase: ReturnType<typeof getServerClient>;
        try {
          supabase = getServerClient(token);
        } catch (error) {
          return jsonError(error instanceof Error ? error.message : "Palvelinasetukset puuttuvat.", 503);
        }

        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !authData.user) return jsonError("Kirjautuminen on vanhentunut. Kirjaudu uudelleen.", 401);

        const { data: thread, error: threadError } = await supabase
          .from("chat_threads")
          .select("id, title")
          .eq("id", body.threadId)
          .eq("user_id", authData.user.id)
          .maybeSingle();
        if (threadError || !thread) return jsonError("Keskustelua ei löytynyt tai sinulla ei ole siihen oikeutta.", 404);

        const openai = createOpenAI({ apiKey: openAIKey });
        const messages = body.messages;
        const firstUserText = messages.find((message) => message.role === "user")?.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(" ")
          .trim();

        const result = streamText({
          model: openai("gpt-4o-mini"),
          system: `Olet Ryhämviisujen Agentti. Vastaa suomeksi, ellei käyttäjä pyydä muuta. Autat käyttäjää ymmärtämään Ryhämviisujen kilpailuja, osioita, artisteja, kappaleita, pisteitä ja raateja. Käytä alla olevia tietokantatyökaluja faktatarkistukseen. Älä keksi puuttuvia tietoja. Tietokantatyökalut ovat vain lukemista varten; älä väitä muuttaneesi tietoja.`,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(5),
          tools: {
            competitions: tool({
              description: "Hae Ryhämviisujen kilpailuvuodet.",
              inputSchema: z.object({ year: z.number().int().optional().describe("Valinnainen kilpailuvuosi") }),
              execute: async ({ year }) => {
                let query = supabase.from("competitions").select("id, year, created_at").order("year", { ascending: false }).limit(30);
                if (year !== undefined) query = query.eq("year", year);
                const { data, error } = await query;
                if (error) throw new Error("Kilpailujen haku epäonnistui.");
                return data;
              },
            }),
            sections: tool({
              description: "Hae kilpailun osiot sekä niiden artistit ja kappaleet.",
              inputSchema: z.object({ year: z.number().int().optional(), type: z.enum(["artistijulkistus", "esittely", "karsinta", "finaali"]).optional() }),
              execute: async ({ year, type }) => {
                let query = supabase.from("sections").select("id, type, video_url, competitions!inner(year), entries(id, artist, song, audience_points, position, status, video_url)").order("created_at", { ascending: true }).limit(60);
                if (year !== undefined) query = query.eq("competitions.year", year);
                if (type) query = query.eq("type", type);
                const { data, error } = await query;
                if (error) throw new Error("Osioiden haku epäonnistui.");
                return data;
              },
            }),
            artists: tool({
              description: "Hae artistien esiintymiset ja kappaleet Ryhämviisuissa.",
              inputSchema: z.object({ name: z.string().optional().describe("Valinnainen artistin nimen osa") }),
              execute: async ({ name }) => {
                const { data, error } = await supabase.from("sections").select("type, competitions!inner(year), entries(id, artist, song, video_url, audience_points, status)").limit(100);
                if (error) throw new Error("Artistien haku epäonnistui.");
                const needle = name?.trim().toLocaleLowerCase("fi-FI");
                return (data ?? []).flatMap((section) => (section.entries ?? [])
                  .filter((entry) => !needle || entry.artist.toLocaleLowerCase("fi-FI").includes(needle))
                  .map((entry) => ({ ...entry, year: section.competitions.year, section: section.type })))
                  .slice(0, 100);
              },
            }),
            points: tool({
              description: "Hae kilpailuosioiden yleisö- ja raadin pisteet.",
              inputSchema: z.object({ year: z.number().int().optional(), artist: z.string().optional() }),
              execute: async ({ year, artist }) => {
                const { data, error } = await supabase.from("sections").select("type, competitions!inner(year), entries(id, artist, song, audience_points, status, jury_votes: jury_votes(points, rank, juries(name)))").in("type", ["karsinta", "finaali"]).limit(60);
                if (error) throw new Error("Pisteiden haku epäonnistui.");
                const needle = artist?.trim().toLocaleLowerCase("fi-FI");
                return (data ?? []).filter((section) => year === undefined || section.competitions.year === year)
                  .flatMap((section) => (section.entries ?? []).filter((entry) => !needle || entry.artist.toLocaleLowerCase("fi-FI").includes(needle))
                    .map((entry) => ({ ...entry, year: section.competitions.year, section: section.type })));
              },
            }),
            juries: tool({
              description: "Hae raateja ja niiden antamia pisteitä.",
              inputSchema: z.object({ year: z.number().int().optional(), sectionType: z.enum(["karsinta", "finaali"]).optional() }),
              execute: async ({ year, sectionType }) => {
                let query = supabase.from("sections").select("type, competitions!inner(year), juries(id, name, position, jury_votes(entry_id, points, rank))").in("type", ["karsinta", "finaali"]).limit(60);
                if (year !== undefined) query = query.eq("competitions.year", year);
                if (sectionType) query = query.eq("type", sectionType);
                const { data, error } = await query;
                if (error) throw new Error("Raadien haku epäonnistui.");
                return data;
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          onFinish: async ({ messages: completedMessages }) => {
            const latestUser = [...messages].reverse().find((message) => message.role === "user");
            const latestAssistant = [...completedMessages].reverse().find((message) => message.role === "assistant");
            const rows = [latestUser, latestAssistant].filter((message): message is UIMessage => Boolean(message)).map((message) => ({
              thread_id: body.threadId!,
              role: message.role,
              parts: message.parts as unknown as Json,
            }));
            if (rows.length) {
              const { error } = await supabase.from("chat_messages").insert(rows);
              if (error) console.error("[Agentti] Viestien tallennus epäonnistui:", error.message);
            }
            const title = thread.title === "Uusi keskustelu" && firstUserText
              ? firstUserText.slice(0, 72)
              : thread.title;
            const { error: updateError } = await supabase.from("chat_threads")
              .update({ title, updated_at: new Date().toISOString() })
              .eq("id", body.threadId!)
              .eq("user_id", authData.user.id);
            if (updateError) console.error("[Agentti] Keskustelun päivitys epäonnistui:", updateError.message);
          },
        });
      },
    },
  },
});
