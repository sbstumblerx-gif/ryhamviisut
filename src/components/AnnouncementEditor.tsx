import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bold, Italic, Link as LinkIcon, ImagePlus, Unlink, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { announcementInput, safeLink } from "@/lib/announcements";
import { saveAnnouncement } from "@/lib/announcements.functions";

const StoredImage = Image.extend({ addAttributes() { return { ...this.parent?.(), storagePath: { default: null } }; } });

export function AnnouncementEditor({ initial, images, onClose }: { initial?: { id: string; title: string; content: unknown }; images: Record<string, string>; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [linkOpen, setLinkOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Kaikki");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const selection = useRef({ from: 0, to: 0 });
  const fileInput = useRef<HTMLInputElement>(null);
  const save = useServerFn(saveAnnouncement);
  const qc = useQueryClient();
  const raw = initial?.content as { type: string; content?: { type: string; attrs?: Record<string, unknown> }[] } | undefined;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, code: false, codeBlock: false, strike: false, underline: false, horizontalRule: false, link: { openOnClick: false, autolink: false, isAllowedUri: safeLink } }), StoredImage],
    content: raw ? { ...raw, content: raw.content?.map(node => node.type === "image" ? { ...node, attrs: { ...node.attrs, storagePath: node.attrs?.src, src: images[String(node.attrs?.src)] ?? "" } } : node) } : { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: { attributes: { class: "announcement-body min-h-72 p-4 outline-none", "aria-label": "Tiedotteen teksti", role: "textbox" } },
  });
  const { data: targets = [] } = useQuery({
    queryKey: ["announcement-link-targets"],
    queryFn: async () => {
      const [entries, years, notices] = await Promise.all([
        supabase.from("entries").select("id,artist,song,section_id"),
        supabase.from("competitions").select("year"),
        supabase.from("announcements").select("id,title"),
      ]);
      if (entries.error || years.error || notices.error) throw new Error("Linkkikohteiden haku epäonnistui.");
      const result = [
        ...[ ["Etusivu", "/"], ["Kilpailut", "/kilpailut"], ["Artistit", "/artistit"], ["Musiikki", "/musiikki"], ["Tilastot", "/tilastot"], ["Äänestä", "/aanesta"], ["Osallistu", "/osallistu"], ["Agentti", "/agentti"], ["Tiedotteet", "/tiedotteet"] ].map(([label, href]) => ({ label, href, category: "Sivu" })),
        ...(years.data ?? []).map(row => ({ label: `Ryhämviisut ${row.year}`, href: `/kilpailut/${row.year}`, category: "Kilpailu" })),
        ...(notices.data ?? []).map(row => ({ label: row.title, href: `/tiedotteet/${row.id}`, category: "Tiedote" })),
      ];
      for (const row of entries.data ?? []) {
        result.push({ label: row.artist, href: `/artistit/${encodeURIComponent(row.artist.trim().toLocaleLowerCase("fi-FI").replace(/\s+/g, "-"))}`, category: "Artisti" });
        if (row.song) result.push({ label: `${row.song} – ${row.artist}`, href: `/osio/${row.section_id}#kappale-${row.id}`, category: "Kappale" });
      }
      return [...new Map(result.map(item => [item.href + item.label, item])).values()];
    },
    enabled: linkOpen,
  });
  function setLink(href: string) {
    if (!safeLink(href) || !editor) { toast.error("Anna kelvollinen linkki."); return; }
    editor.chain().focus().setTextSelection(selection.current).setLink({ href }).run();
    setLinkOpen(false);
  }
  return <section className="mb-8 border-y py-6">
    <Input aria-label="Tiedotteen otsikko" placeholder="Tiedotteen otsikko" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} className="mb-4" />
    <div className="overflow-hidden rounded-md border bg-card">
      <div role="toolbar" aria-label="Tekstityökalut" className="flex flex-wrap gap-1 border-b bg-secondary p-2">
        <Button variant="ghost" size="icon" title="Lihavointi" aria-label="Lihavointi" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold /></Button>
        <Button variant="ghost" size="icon" title="Kursivointi" aria-label="Kursivointi" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic /></Button>
        <Button variant="ghost" size="icon" title="Lisää linkki" aria-label="Lisää linkki" disabled={!editor} onMouseDown={e => e.preventDefault()} onClick={() => {
          if (!editor || editor.state.selection.empty) { toast.error("Valitse ensin linkitettävä sana tai teksti."); return; }
          selection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
          setUrl(editor.getAttributes("link").href ?? ""); setLinkOpen(true);
        }}><LinkIcon /></Button>
        <Button variant="ghost" size="icon" title="Poista linkki" aria-label="Poista linkki" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().unsetLink().run()}><Unlink /></Button>
        <Button variant="ghost" size="icon" title="Lisää kuva" aria-label="Lisää kuva" disabled={uploading} onClick={() => fileInput.current?.click()}><ImagePlus /></Button>
      </div>
      <EditorContent editor={editor} />
    </div>
    <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = "";
      if (!file || !editor) return;
      const ext = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } as Record<string,string>)[file.type];
      if (!ext || file.size > 10 * 1024 * 1024) { toast.error("Valitse PNG-, JPG-, WebP- tai GIF-kuva, enintään 10 Mt."); return; }
      setUploading(true);
      try {
        const path = `${crypto.randomUUID()}.${ext}`;
        const upload = await supabase.storage.from("announcement-images").upload(path, file, { contentType: file.type });
        if (upload.error) throw upload.error;
        const signed = await supabase.storage.from("announcement-images").createSignedUrl(path, 3600);
        if (!signed.data) throw new Error("Kuvan lataaminen epäonnistui.");
        editor.chain().focus().insertContent({ type: "image", attrs: { src: signed.data.signedUrl, storagePath: path, alt: file.name } }).run();
      } catch { toast.error("Kuvan lisääminen epäonnistui."); } finally { setUploading(false); }
    }} />
    {uploading && <p role="status" className="mt-2 text-muted-foreground">Kuvaa lisätään…</p>}
    <div className="mt-4 flex gap-2"><Button disabled={busy || uploading || !editor} onClick={async () => {
      if (!editor) return;
      const json = editor.getJSON();
      const content = { ...json, content: json.content?.map(node => node.type === "image" ? { ...node, attrs: { ...node.attrs, src: node.attrs?.storagePath, storagePath: undefined } } : node) };
      const parsed = announcementInput.safeParse({ id: initial?.id, title, content });
      if (!parsed.success) { toast.error("Tarkista otsikko, teksti ja linkit."); return; }
      setBusy(true);
      try { await save({ data: parsed.data }); await qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Tiedote julkaistu."); onClose(); }
      catch { toast.error("Tallennus epäonnistui. Tarkista ylläpito-oikeutesi."); } finally { setBusy(false); }
    }}><Save />{busy ? "Tallennetaan…" : initial ? "Tallenna muutokset" : "Julkaise tiedote"}</Button><Button variant="outline" onClick={onClose}>Peruuta</Button></div>
    <Dialog open={linkOpen} onOpenChange={setLinkOpen}><DialogContent aria-describedby={undefined} className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto"><DialogTitle>Valitse linkin kohde</DialogTitle>
      <Input aria-label="Hae linkin kohdetta" placeholder="Hae kappaletta, artistia, kilpailua…" value={search} onChange={e => setSearch(e.target.value)} />
      <select aria-label="Kohteen tyyppi" className="rounded-md border bg-background p-2" value={category} onChange={e => setCategory(e.target.value)}>{["Kaikki", "Kappale", "Artisti", "Kilpailu", "Tiedote", "Sivu"].map(value => <option key={value}>{value}</option>)}</select>
      <div className="max-h-64 space-y-1 overflow-y-auto">{targets.filter(item => (category === "Kaikki" || item.category === category) && item.label.toLocaleLowerCase("fi").includes(search.toLocaleLowerCase("fi"))).map(item => <Button key={item.href + item.label} variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => setLink(item.href)}><span className="text-xs text-muted-foreground">{item.category}</span>{item.label}</Button>)}</div>
      <div className="border-t pt-4"><label className="text-sm" htmlFor="custom-link">Muu osoite</label><Input id="custom-link" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} /><Button className="mt-2" disabled={!url} onClick={() => setLink(url)}>Lisää linkki</Button></div>
    </DialogContent></Dialog>
  </section>;
}