import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function artistKey(name: string) {
  return name.trim().toLocaleLowerCase("fi-FI").replace(/\\s+/g, "-");
}

function useArtistImages() {
  return useQuery({
    queryKey: ["artist-profile-images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("artist_profiles").select("slug, image_path");
      if (error) throw error;
      return new Map((data ?? []).filter((row) => row.image_path).map((row) => [
        row.slug,
        supabase.storage.from("artist-images").getPublicUrl(row.image_path!).data.publicUrl,
      ]));
    },
    staleTime: 60_000,
  });
}

export function ArtistLink({ name, className }: { name: string; className?: string }) {
  const { data: images } = useArtistImages();
  const imageUrl = images?.get(artistKey(name));
  return (
    <Link
      to="/artistit/$artist"
      params={{ artist: artistKey(name) }}
      reloadDocument
      className={`inline-flex items-center gap-2 ${className ?? "text-primary hover:underline"}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full border object-cover" />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-full border bg-muted" aria-hidden="true" />
      )}
      <span>{name}</span>
    </Link>
  );
}
