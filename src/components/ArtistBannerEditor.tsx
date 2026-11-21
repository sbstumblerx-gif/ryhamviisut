import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const OUTPUT_WIDTH = 2560;
const OUTPUT_HEIGHT = 423;
const MOBILE_WIDTH = 1546;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  slug: string;
  currentBanner: string | null;
  onUploaded: (path: string) => Promise<void>;
  disabled?: boolean;
};

export function ArtistBannerEditor({ slug, currentBanner, onUploaded, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(50);
  const [offsetY, setOffsetY] = useState(50);
  const [saving, setSaving] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source);
  }, [source]);

  function chooseFile(file?: File) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Valitse JPG-, PNG- tai WebP-kuva.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Kuvan enimmäiskoko on 15 Mt.");
      return;
    }
    if (source) URL.revokeObjectURL(source);
    setSource(URL.createObjectURL(file));
    setZoom(1);
    setOffsetX(50);
    setOffsetY(50);
    setOpen(true);
  }

  async function exportAndUpload() {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    setSaving(true);
    try {
      const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
      const baseScale = Math.max(OUTPUT_WIDTH / image.naturalWidth, OUTPUT_HEIGHT / image.naturalHeight);
      const scale = baseScale * zoom;
      const renderedWidth = image.naturalWidth * scale;
      const renderedHeight = image.naturalHeight * scale;
      const maxX = Math.max(0, renderedWidth - OUTPUT_WIDTH);
      const maxY = Math.max(0, renderedHeight - OUTPUT_HEIGHT);
      const cropX = maxX * (offsetX / 100);
      const cropY = maxY * (offsetY / 100);

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Kuvan käsittely epäonnistui.");
      context.drawImage(
        image,
        cropX / scale,
        cropY / scale,
        OUTPUT_WIDTH / scale,
        OUTPUT_HEIGHT / scale,
        0,
        0,
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Kuvan vienti epäonnistui.")), "image/webp", 0.9),
      );
      const path = `${slug}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from("artist-banners").upload(path, blob, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw new Error("Bannerin lataus epäonnistui. Tarkista artistitilin oikeudet.");
      await onUploaded(path);
      setOpen(false);
      toast.success("Banneri tallennettu.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bannerin tallentaminen epäonnistui.");
    } finally {
      setSaving(false);
    }
  }

  const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;

  return (
    <section className="mb-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Artistin banneri</h2>
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="mr-2 h-4 w-4" /> {currentBanner ? "Vaihda banneri" : "Lisää banneri"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
      </div>
      {currentBanner ? (
        <img src={currentBanner} alt="Artistin banneri" className="block w-full rounded-xl border object-cover" />
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Artistilla ei ole vielä banneria.</p>
      )}
      <p className="text-sm text-muted-foreground">Lopullinen koko 2560 × 423 px. Mobiilissa näkyy keskimmäinen 1546 × 423 px alue.</p>

      <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rajaa artistin banneri</DialogTitle>
            <DialogDescription>Rajaus tallennetaan kokoon 2560 × 423 px. Keskimmäinen rajausviivojen väli on mobiilissa näkyvä 1546 × 423 px alue.</DialogDescription>
          </DialogHeader>
          {source && (
            <>
              <div className="relative mx-auto w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: String(targetRatio) }}>
                <img
                  ref={imageRef}
                  src={source}
                  alt="Rajattava bannerikuva"
                  onLoad={(event) => { imageRef.current = event.currentTarget; }}
                  className="absolute inset-0 h-full w-full"
                  style={{
                    objectFit: "cover",
                    objectPosition: `${offsetX}% ${offsetY}%`,
                    transform: `scale(${zoom})`,
                  }}
                />
                <div className="pointer-events-none absolute inset-y-0 border-x-2 border-dashed border-white/90"
                  style={{ left: `${((OUTPUT_WIDTH - MOBILE_WIDTH) / 2 / OUTPUT_WIDTH) * 100}%`, right: `${((OUTPUT_WIDTH - MOBILE_WIDTH) / 2 / OUTPUT_WIDTH) * 100}%` }}>
                  <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">MOBIILIALUE 1546 × 423</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-medium"><ZoomIn className="h-4 w-4" /> Zoom</label>
                <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={(values) => setZoom(values[0] ?? 1)} />
                <label className="block text-sm font-medium">Vaakasuuntainen rajaus</label>
                <Slider min={0} max={100} step={1} value={[offsetX]} onValueChange={(values) => setOffsetX(values[0] ?? 50)} />
                <label className="block text-sm font-medium">Pystysuuntainen rajaus</label>
                <Slider min={0} max={100} step={1} value={[offsetY]} onValueChange={(values) => setOffsetY(values[0] ?? 50)} />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Peruuta</Button>
                <Button disabled={saving} onClick={exportAndUpload}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Rajaa ja tallenna
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
