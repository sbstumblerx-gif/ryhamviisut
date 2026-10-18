import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Bot, MessageSquarePlus, Send, Trash2, LogIn, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";

type Thread = { id: string; title: string; updated_at: string };
type StoredMessage = { id: string; role: string; parts: unknown };

export const Route = createFileRoute("/agentti")({
  head: () => ({
    meta: [
      { title: "Agentti – Ryhämviisut" },
      { name: "description", content: "Kysy Ryhämviisujen kilpailuista, artisteista ja pisteistä." },
    ],
  }),
  component: AgenttiPage,
});

function AgenttiPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [sending, setSending] = useState(false);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/agent",
    headers: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
    body: { threadId },
  }), [threadId]);

  const { messages: chatMessages, sendMessage, setMessages: setChatMessages, status, error } = useChat({
    transport,
    messages,
    onError: (err) => toast.error(err.message || "Agentti ei pystynyt vastaamaan."),
  });

  const loadThreads = useCallback(async (uid: string) => {
    const { data, error: queryError } = await supabase.from("chat_threads")
      .select("id, title, updated_at").eq("user_id", uid).order("updated_at", { ascending: false }).limit(50);
    if (queryError) {
      toast.error("Keskusteluhistoriaa ei voitu ladata.");
      return;
    }
    setThreads(data ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) await loadThreads(uid);
      if (active) setLoadingThreads(false);
    }).catch(() => { if (active) setLoadingThreads(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const uid = session?.user.id ?? null;
      setUserId(uid);
      if (uid) void loadThreads(uid);
      else { setThreads([]); setThreadId(null); setChatMessages([]); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadThreads, setChatMessages]);

  useEffect(() => {
    setMessages(chatMessages);
  }, [chatMessages]);

  const openThread = useCallback(async (id: string) => {
    setThreadId(id);
    setLoadingMessages(true);
    const { data, error: queryError } = await supabase.from("chat_messages")
      .select("id, role, parts").eq("thread_id", id).order("created_at", { ascending: true }).limit(200);
    if (queryError) {
      toast.error("Keskustelua ei voitu avata.");
      setLoadingMessages(false);
      return;
    }
    const loaded = (data ?? []).map((item: StoredMessage) => ({
      id: item.id,
      role: item.role as UIMessage["role"],
      parts: Array.isArray(item.parts) ? item.parts : [],
    })) as UIMessage[];
    setMessages(loaded);
    setChatMessages(loaded);
    setLoadingMessages(false);
  }, [setChatMessages]);

  const startNew = useCallback(async () => {
    if (!userId) return;
    const { data, error: insertError } = await supabase.from("chat_threads")
      .insert({ user_id: userId, title: "Uusi keskustelu" }).select("id, title, updated_at").single();
    if (insertError || !data) {
      toast.error("Uuden keskustelun luominen epäonnistui. Tarkista chat-taulujen käyttöoikeudet.");
      return;
    }
    setThreads((current) => [data, ...current]);
    setThreadId(data.id);
    setMessages([]);
    setChatMessages([]);
  }, [userId, setChatMessages]);

  const removeThread = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from("chat_threads").delete().eq("id", id);
    if (deleteError) { toast.error("Keskustelua ei voitu poistaa."); return; }
    setThreads((current) => current.filter((thread) => thread.id !== id));
    if (threadId === id) {
      setThreadId(null);
      setMessages([]);
      setChatMessages([]);
    }
    toast.success("Keskustelu poistettu.");
  }, [threadId, setChatMessages]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !userId || sending || status === "streaming") return;
    let activeThreadId = threadId;
    if (!activeThreadId) {
      const { data, error: insertError } = await supabase.from("chat_threads")
        .insert({ user_id: userId, title: text.slice(0, 72) || "Uusi keskustelu" })
        .select("id, title, updated_at").single();
      if (insertError || !data) {
        toast.error("Uuden keskustelun luominen epäonnistui.");
        return;
      }
      activeThreadId = data.id;
      setThreadId(data.id);
      setThreads((current) => [data, ...current]);
    }
    setInput("");
    setSending(true);
    try {
      await sendMessage({ text }, { body: { threadId: activeThreadId } });
      await loadThreads(userId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Viestin lähettäminen epäonnistui.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell title="Agentti">
      {!userId ? (
        <div className="tile mx-auto max-w-xl space-y-4 p-6 text-center">
          <Bot className="mx-auto h-10 w-10 text-primary" />
          <h2 className="text-2xl">Ryhämviisujen oma tekoälyavustaja</h2>
          <p className="text-muted-foreground">Kirjaudu sisään, jotta voit keskustella Agentin kanssa ja tallentaa keskusteluhistorian omaan tiliisi.</p>
          <Button asChild><Link to="/kirjaudu"><LogIn className="mr-2 h-4 w-4" />Kirjaudu sisään</Link></Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <Button className="w-full" onClick={startNew}><MessageSquarePlus className="mr-2 h-4 w-4" />Uusi keskustelu</Button>
            <div className="space-y-2">
              {loadingThreads && <p className="text-sm text-muted-foreground">Ladataan keskusteluja…</p>}
              {!loadingThreads && threads.length === 0 && <p className="text-sm text-muted-foreground">Ei vielä keskusteluja.</p>}
              {threads.map((thread) => (
                <div key={thread.id} className={`flex items-center gap-1 rounded-lg border p-2 ${thread.id === threadId ? "border-primary bg-primary/5" : "border-border"}`}>
                  <button className="min-w-0 flex-1 truncate text-left text-sm hover:text-primary" onClick={() => void openThread(thread.id)} title={thread.title}>{thread.title}</button>
                  <button className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Poista keskustelu" onClick={() => void removeThread(thread.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </aside>
          <section className="flex min-h-[65vh] flex-col rounded-xl border bg-card">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {loadingMessages ? <p className="text-sm text-muted-foreground">Avataan keskustelua…</p> : null}
              {!loadingMessages && chatMessages.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                  <Bot className="h-10 w-10 text-primary" />
                  <h2 className="text-xl font-semibold">Mitä haluat tietää Ryhämviisuista?</h2>
                  <p className="max-w-md text-sm text-muted-foreground">Agentti voi hakea kilpailuvuosia, osioita, artisteja, kappaleita, pisteitä ja raateja tietokannasta.</p>
                </div>
              )}
              {chatMessages.map((message) => (
                <Message key={message.id} from={message.role} className="max-w-full">
                  <MessageContent className={message.role === "user" ? "rounded-lg bg-secondary px-4 py-3" : "w-full"}>
                    {message.parts.map((part, index) => part.type === "text"
                      ? <MessageResponse key={index}>{part.text}</MessageResponse>
                      : null)}
                  </MessageContent>
                </Message>
              ))}
              {status === "streaming" && <div className="text-sm text-muted-foreground"><Shimmer>Agentti miettii…</Shimmer></div>}
              {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
            </div>
            <form onSubmit={submitMessage} className="flex gap-2 border-t p-3">
              <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Kysy Ryhämviisuista…" aria-label="Viesti Agentille" disabled={sending || status === "streaming"} />
              <Button type="submit" disabled={!input.trim() || sending || status === "streaming"} aria-label="Lähetä viesti">
                {sending || status === "streaming" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </section>
        </div>
      )}
    </PageShell>
  );
}
