import { useRef, useState } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Italic, Link as LinkIcon, ImagePlus, Unlink, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { announcementInput, safeLink } from "@/lib/announcements";
import { useAdmin } from "@/lib/admin";

const StoredImage = Image.extend({ addAttributes() { return { ...this.parent?.(), storagePath: { default: null } }; } });

export function WikiArticleEditor({ initial, images, onClose }: { initial?: { id: string; title: string; content: unknown }; images: Record<string, string>; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const selection = useRef({ from: 0, to: 0 });
  const fileInput = useRef<HTMLInputElement>(null);
  const { run } = useAdmin();
  const raw = initial?.content as JSONContent | undefined;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, code: false, codeBlock: false, strike: false, underline: false, horizontalRule: false, link: { openOnClick: false, autolink: false, isAllowedUri: safeLink } }), StoredImage],
    content: (raw ? { ...raw, content: raw.content?.map(node => node.type === "image" ? { ...node, attrs: { ...node.attrs, storagePath: node.attrs?.["src"], src: images[String(node.attrs?.["src"])] ?? "" } } : node) } : { type: "doc", content: [{ type: "paragraph" }] }) as JSONContent,
    editorProps: { attributes: { class: "announcement-body min-h-72 p-4 outline-none", "aria-label": "Wiki-artikkelin teksti", role: "textbox" } },
  });
  function setLink(href: string) {
    if (!safeLink(href) || !editor) { toast.error("Anna kelvollinen linkki."); return; }
    editor.chain().focus().setTextSelection(selection.current).setLink({ href }).run();
    setLinkOpen(false);
  }
  return <section className="space-y-4 rounded-xl border p-4">
    <Input aria-label="Artikkelin otsikko" placeholder="Artikkelin otsikko" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} />
    <div className="overflow-hidden rounded-md border bg-card">
      <div role="toolbar" aria-label="Tekstityökalut" className="flex flex-wrap gap-1 border-b bg-secondary p-2">
        <Button variant="ghost" size="icon" title="Lihavointi" aria-label="Lihavointi" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold /></Button>
        <Button variant="ghost" size="icon" title="Kursivointi" aria-label="Kursivointi" onMouseDown={e => e.preventDefault()} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic /></Button>
        <Button variant="ghost" size="icon" title="Lisää linkki" aria-label="Lisää linkki" disabled={!editor} onMouseDown={e => e.preventDefault()} onClick={() => {
          if (!editor || editor.state.selection.empty) { toast.error("Valitse ensin linkitettävä teksti."); return; }
          selection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
          setUrl(editor.getAttributes("link")["href"] ?? ""); setLinkOpen(true);
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
        const ticket = await run({ type: "createAnnouncementUpload", path, contentType: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif" }) as { token?: string };
        if (!ticket.token) throw new Error("Kuvan latauslinkin luominen epäonnistui.");
        const upload = await supabase.storage.from("announcement-images").uploadToSignedUrl(path, ticket.token, file, { contentType: file.type });
        if (upload.error) throw upload.error;
        const preview = await run({ type: "getAnnouncementImageUrl", path }) as { signedUrl?: string };
        if (!preview.signedUrl) throw new Error("Esikatselulinkin luominen epäonnistui.");
        editor.chain().focus().insertContent({ type: "image", attrs: { src: preview.signedUrl, storagePath: path, alt: file.name } }).run();
      } catch { toast.error("Kuvan lisääminen epäonnistui."); } finally { setUploading(false); }
    }} />
    {uploading && <p role="status" className="text-sm text-muted-foreground">Kuvaa lisätään…</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || uploading || !editor} onClick={async () => {
      if (!editor) return;
      const json = editor.getJSON();
      const content = { ...json, content: json.content?.map(node => node.type === "image" ? { ...node, attrs: { ...node.attrs, src: node.attrs?.["storagePath"], storagePath: undefined } } : node) };
      const parsed = announcementInput.safeParse({ id: initial?.id, title, content });
      if (!parsed.success) { toast.error("Tarkista otsikko, teksti ja linkit."); return; }
      setBusy(true);
      try {
        const { saveWikiArticle } = await import("@/lib/wiki.functions");
        await saveWikiArticle({ data: parsed.data });
        toast.success("Wiki-artikkeli tallennettu."); onClose();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Tallennus epäonnistui."); } finally { setBusy(false); }
    }}><Save />{busy ? "Tallennetaan…" : initial ? "Tallenna muutokset" : "Julkaise artikkeli"}</Button><Button variant="outline" onClick={onClose}>Peruuta</Button></div>
    <Dialog open={linkOpen} onOpenChange={setLinkOpen}><DialogContent aria-describedby={undefined}><DialogTitle>Lisää linkki</DialogTitle><Input placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} /><Button disabled={!url} onClick={() => setLink(url)}>Lisää linkki</Button></DialogContent></Dialog>
  </section>;
}