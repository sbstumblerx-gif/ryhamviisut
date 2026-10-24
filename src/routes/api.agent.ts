import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";

type ChatBody = { threadId?: string; messages?: UIMessage[] };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getServerClient(accessToken: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
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

        const lovableApiKey = process.env["LOVABLE_API_KEY"];
        if (!lovableApiKey) return jsonError("Agentin tekoälyasetukset puuttuvat palvelimelta.", 503);

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

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const openai = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: lovableApiKey,
          headers: { "Lovable-API-Key": lovableApiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyDb = supabase as any;
        const messages = body.messages;
        const firstUserText = messages.find((message) => message.role === "user")?.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(" ")
          .trim();

        const result = streamText({
          model: openai.responses("openai/gpt-6-astra"),
          instructions: `Olet Ryhämviisujen Agentti, sarjan tiedonhakija ja faktantarkistaja. Vastaa suomeksi, ellei käyttäjä pyydä muuta. Autat käyttäjää löytämään tietoa Ryhämviisujen kilpailuista, osioista, artisteista, kappaleista, pisteistä, raadeista ja kaikesta muusta tietokantaan tallennetusta. Tarkista faktat aina työkaluilla ennen vastaamista. Jos erikoistyökalu ei riitä, käytä list_tables-työkalua nähdäksesi kaikki tietokannan taulut (myös uudet) ja read_table-työkalua niiden lukemiseen. Älä keksi puuttuvia tietoja: kerro selvästi, jos tietoa ei löydy. Kerro lyhyesti mihin tietoon vastauksesi perustuu. Työkalut ovat vain lukemista varten; älä väitä muuttaneesi tietoja.`,
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(8),
          tools: {
            list_tables: tool({
              description: "Listaa kaikki tietokannan taulut sarakkeineen, myös myöhemmin lisätyt. Käytä tätä, kun tarvitset tietoa jota erikoistyökalut eivät kata.",
              inputSchema: z.object({}),
              execute: async () => {
                const { data, error } = await supabase.rpc("agent_schema_catalog");
                if (error) throw new Error("Taululistauksen haku epäonnistui.");
                return data;
              },
            }),
            read_table: tool({
              description: "Lue rivejä mistä tahansa tietokannan taulusta (vain luku). Hae ensin taulujen nimet list_tables-työkalulla.",
              inputSchema: z.object({
                table: z.string().min(1).describe("Taulun nimi"),
                columns: z.string().optional().describe("Pilkuilla erotetut sarakkeet, oletus kaikki"),
                filters: z.array(z.object({ column: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) })).optional().describe("Yhtäsuuruussuodattimet"),
                search: z.object({ column: z.string(), text: z.string() }).optional().describe("Tekstihaku sarakkeesta (sisältää, kirjainkoosta riippumaton)"),
                orderBy: z.string().optional(),
                ascending: z.boolean().optional(),
                limit: z.number().int().min(1).max(200).optional(),
              }),
              execute: async ({ table, columns, filters, search, orderBy, ascending, limit }) => {
                if (!/^[a-z_][a-z0-9_]*$/i.test(table)) throw new Error("Virheellinen taulun nimi.");
                let query = anyDb.from(table).select(columns || "*").limit(limit ?? 50);
                for (const filter of filters ?? []) query = query.eq(filter.column, filter.value);
                if (search) query = query.ilike(search.column, `%${search.text.replace(/[%_]/g, "")}%`);
                if (orderBy) query = query.order(orderBy, { ascending: ascending ?? true });
                const { data, error } = await query;
                if (error) throw new Error(`Taulun ${table} luku epäonnistui: ${error.message}`);
                return data;
              },
            }),
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

        return withLovableAiGatewayRunIdHeader(result.toUIMessageStreamResponse({
          sendReasoning: true,
          onError: (error) => {
            console.error("[Agentti] Virhe:", error);
            const status = (error as { statusCode?: number })?.statusCode;
            if (status === 429) return "Agentilla on nyt ruuhkaa. Yritä hetken päästä uudelleen.";
            if (status === 402) return "Tekoälykrediitit ovat loppuneet. Lisää krediittejä työtilan asetuksista.";
            if (status === 403) return "Tekoälyn käyttö on estetty tämän työtilan asetuksissa.";
            return "Agentti ei pystynyt vastaamaan. Yritä uudelleen.";
          },
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
        }), runIdFetch);
      },
    },
  },
});
