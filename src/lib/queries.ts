import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SECTION_TYPES = ["artistijulkistus", "esittely", "karsinta", "finaali"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
export const SECTION_LABEL: Record<SectionType, string> = {
  artistijulkistus: "Artistijulkistus",
  esittely: "Esittely",
  karsinta: "Karsinta",
  finaali: "Finaali",
};

export const competitionsQuery = queryOptions({
  queryKey: ["competitions"],
  queryFn: async () => {
    const { data, error } = await supabase.from("competitions").select("*").order("year", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const yearQuery = (year: number) =>
  queryOptions({
    queryKey: ["year", year],
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("*, sections(*)").eq("year", year).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const sectionQuery = (id: string) =>
  queryOptions({
    queryKey: ["section", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*, competitions(year), entries(*), juries(*, jury_votes(*))")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });


export const artistDirectoryQuery = queryOptions({
  queryKey: ["artist-directory"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("id, type, competitions(year), entries(id, artist, song, audience_points, status)");
    if (error) throw error;

    const artists = new Map<string, { name: string; appearances: { year: number | null; sectionType: string; song: string | null }[]; competitionYears: number[] }>();
    for (const section of data ?? []) {
      for (const entry of section.entries ?? []) {
        const name = entry.artist?.trim();
        if (!name) continue;
        const key = name.toLocaleLowerCase("fi-FI");
        const artist = artists.get(key) ?? { name, appearances: [], competitionYears: [] };
        const year = section.competitions?.year ?? null;
        if (year !== null && !artist.competitionYears.includes(year)) artist.competitionYears.push(year);
        artist.appearances.push({
          year,
          sectionType: section.type,
          song: entry.song,
        });
        artists.set(key, artist);
      }
    }

    return [...artists.values()].sort((a, b) => a.name.localeCompare(b.name, "fi"));
  },
});

export const artistDetailQuery = (artistSlug: string) =>
  queryOptions({
    queryKey: ["artist-detail", artistSlug],
    queryFn: async () => {
      const [{ data, error }, { data: links, error: linksError }] = await Promise.all([
        supabase.from("sections").select("id, type, competitions(id, year), entries(id, artist, song, video_url, audience_points, status, created_at), juries(*, jury_votes(*))"),
        supabase.from("person_links").select("person_id, entity_type, entity_key, entity_name"),
      ]);
      if (error) throw error;
      if (linksError) throw linksError;

      const normalize = (name: string) => name.trim().toLocaleLowerCase("fi-FI");
      const target = (links ?? []).find((link) => link.entity_type === "artist" && link.entity_key.trim().toLocaleLowerCase("fi-FI").replace(/\\s+/g, "-") === artistSlug);
      const names = target
        ? (links ?? []).filter((link) => link.person_id === target.person_id && link.entity_type === "artist").map((link) => link.entity_key)
        : [artistSlug.replace(/-/g, " ").toLocaleLowerCase("fi-FI")];
      const nameSet = new Set(names);
      const appearances = (data ?? []).flatMap((section) =>
        (section.entries ?? [])
          .filter((entry) => entry.artist?.trim() && nameSet.has(normalize(entry.artist)))
          .map((entry) => ({
            ...entry,
            year: section.competitions?.year ?? null,
            sectionType: section.type,
            sectionId: section.id,
            competitionId: section.competitions?.id ?? null,
            sectionEntries: section.entries ?? [],
            juries: section.juries ?? [],
          })),
      );
      appearances.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.created_at.localeCompare(a.created_at));
      const name = appearances[0]?.artist ?? null;
      const linkedAliases = target ? (links ?? []).filter((link) => link.person_id === target.person_id).map((link) => link.entity_name) : [];
      const aliases = [...new Set([...linkedAliases, ...appearances.map((entry) => entry.artist)].filter((entry) => entry !== name))];
      const { data: profile } = await supabase
        .from("artist_profiles")
        .select("description, banner_path, image_path")
        .eq("slug", artistSlug)
        .maybeSingle();
      return {
        name,
        appearances,
        description: profile?.description ?? null,
        bannerPath: profile?.banner_path ?? null,
        imagePath: profile?.image_path ?? null,
        imageUrl: profile?.image_path ? supabase.storage.from("artist-images").getPublicUrl(profile.image_path).data.publicUrl : null,
        bannerUrl: profile?.banner_path ? supabase.storage.from("artist-banners").getPublicUrl(profile.banner_path).data.publicUrl : null,
      };
    },
  });
