import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnnouncementBody } from "@/components/AnnouncementBody";
import { WikiArticleEditor } from "@/components/WikiArticleEditor";
import { useAdmin } from "@/lib/admin";
import { readWikiArticles, deleteWikiArticle } from "@/lib/wiki.functions";

export const Route = createFileRoute("/wiki")({
  head: () => ({ meta: [{ title: "RyhämWiki – Ryhämviisut" }, { name: "description", content: "Ryhämviisujen tietosanakirja ja artikkelit." }] }),
  component: WikiPage,
});

function WikiPage() {
  const load = useServerFn(readWikiArticles);
  const { isAdmin } = useAdmin();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["wiki-articles"], queryFn: () => load() });
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ id: string; title: string; content: unknown } | null | false>(false);
  const [opened, setOpened] = useState<string | null>(null);
  const articles = useMemo(() => (data?.articles ?? []).filter(article => (article.title + " " + JSON.stringify(article.content)).toLocaleLowerCase("fi").includes(search.toLocaleLowerCase("fi"))), [data, search]);
  const selected = data?.articles.find(article => article.id === opened);
  return <PageShell title="RyhämWiki" back="/lisaa">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground">Ryhämviisujen yhteinen tietopankki.</p>
      {isAdmin && <Button onClick={() => { setEditor(null); setOpened(null); }}><Plus className="mr-2 h-4 w-4" />Uusi artikkeli</Button>}
    </div>
    {editor !== false && <WikiArticleEditor key={editor ? editor.id : "new"} {...(editor ? { initial: editor } : {})} images={data?.images ?? {}} onClose={() => { setEditor(false); void qc.invalidateQueries({ queryKey: ["wiki-articles"] }); }} />}
    <div className="relative my-5"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setOpened(null); }} placeholder="Hae artikkeleita…" aria-label="Hae Wiki-artikkeleita" /></div>
    {selected ? <article className="tile p-5 sm:p-7">
      <Button variant="ghost" size="sm" onClick={() => setOpened(null)}>← Kaikki artikkelit</Button>
      <h2 className="mb-3 mt-3 text-3xl font-semibold">{selected.title}</h2>
      <p className="mb-5 text-xs text-muted-foreground">Päivitetty {new Date(selected.updated_at).toLocaleDateString("fi-FI")}</p>
      {isAdmin && <div className="mb-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditor({ id: selected.id, title: selected.title, content: selected.content })}><Pencil className="mr-2 h-4 w-4" />Muokkaa</Button><Button size="sm" variant="destructive" onClick={async () => { if (!window.confirm(`Poistetaanko artikkeli ”${selected.title}”?`)) return; try { await deleteWikiArticle({ data: { id: selected.id } }); setOpened(null); await qc.invalidateQueries({ queryKey: ["wiki-articles"] }); toast.success("Artikkeli poistettu."); } catch { toast.error("Artikkelin poistaminen epäonnistui."); } }}><Trash2 className="mr-2 h-4 w-4" />Poista</Button></div>}
      <AnnouncementBody content={selected.content} images={data?.images ?? {}} />
    </article> : isLoading ? <p className="text-muted-foreground">Ladataan artikkeleita…</p> : error ? <p className="text-destructive">Artikkelien lataaminen epäonnistui.</p> : articles.length ? <div className="space-y-3">{articles.map(article => <button key={article.id} onClick={() => setOpened(article.id)} className="tile block w-full p-5 text-left"><h2 className="text-xl font-semibold">{article.title}</h2><p className="mt-1 text-xs text-muted-foreground">Päivitetty {new Date(article.updated_at).toLocaleDateString("fi-FI")}</p></button>)}</div> : <div className="rounded-xl border p-8 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="text-xl font-semibold">{search ? "Ei hakutuloksia" : "Ei vielä artikkeleita"}</h2><p className="mt-2 text-sm text-muted-foreground">{search ? "Kokeile toista hakusanaa." : "Ylläpitäjä voi lisätä ensimmäisen artikkelin."}</p></div>}
  </PageShell>;
}