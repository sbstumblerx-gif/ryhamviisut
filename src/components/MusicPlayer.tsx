import { useEffect, useState } from "react";
import { Music2, X } from "lucide-react";
import { youtubeEmbed } from "@/lib/admin";

const STORAGE_KEY = "ryhamviisut-current-track";

type Track = { title: string; artist: string; url: string };

function readTrack(): Track | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as Track) : null;
  } catch {
    return null;
  }
}

export function playMusicTrack(track: Track) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(track));
  window.dispatchEvent(new CustomEvent("ryhamviisut:play-track", { detail: track }));
}

export function MusicPlayer() {
  const [track, setTrack] = useState<Track | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setTrack(readTrack());
    const onPlay = (event: Event) => {
      const next = (event as CustomEvent<Track>).detail;
      setTrack(next);
      setVisible(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setTrack(readTrack());
    };
    window.addEventListener("ryhamviisut:play-track", onPlay);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("ryhamviisut:play-track", onPlay);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const embed = youtubeEmbed(track?.url);
  if (!track || !embed || !visible) return null;

  return (
    <aside className="fixed bottom-3 right-3 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
      <div className="flex items-center gap-2 px-3 py-2">
        <Music2 className="h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{track.title}</p>
          <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
        </div>
        <button
          aria-label="Sulje musiikkisoitin"
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          onClick={() => {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // The component state still hides the player if storage is unavailable.
            }
            setTrack(null);
            setVisible(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="aspect-video bg-black">
        <iframe
          key={embed}
          src={embed + "?autoplay=1&playsinline=1"}
          className="h-full w-full"
          title={`Musiikkivideo: ${track.title}`}
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </aside>
  );
}
