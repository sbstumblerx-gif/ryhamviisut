import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  currentImage: string | null;
  onUploaded: (path: string) => Promise<void>;
  disabled?: boolean;
};

export function ArtistImageEditor({ slug, currentImage, onUploaded, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Valitse JPG-, PNG- tai WebP-kuva.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Kuvan enimmäiskoko on 15 Mt.");
      return;
    }

    setSaving(true);
    try {
      const sourceUrl = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = sourceUrl;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Kuvan avaaminen epäonnistui."));
        });
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const sx = (image.naturalWidth - side) / 2;
        const sy = (image.naturalHeight - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Kuvan käsittely epäonnistui.");
        context.drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Kuvan vienti epäonnistui.")), "image/webp", 0.9),
        );
        const path = `${slug}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from("artist-images").upload(path, blob, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw new Error("Artistikuvan lataus epäonnistui. Tarkista artistitilin oikeudet.");
        await onUploaded(path);
        toast.success("Artistikuva tallennettu.");
      } finally {
        URL.revokeObjectURL(sourceUrl);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Artistikuvan tallentaminen epäonnistui.");
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={disabled || saving} onClick={() => inputRef.current?.click()}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
        {currentImage ? "Vaihda artistikuva" : "Lisää artistikuva"}
      </Button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
      <span className="text-sm text-muted-foreground">Neliörajauksen keskiosa tallennetaan 512 × 512 px WebP-kuvana.</span>
    </div>
  );
}
