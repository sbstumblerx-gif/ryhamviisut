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
      const { data, error } = await supabase
        .from("sections")
        .select("id, type, competitions(id, year), entries(id, artist, song, video_url, audience_points, status, created_at), juries(*, jury_votes(*))");
      if (error) throw error;

      const artistKey = (name: string) => name.trim().toLocaleLowerCase("fi-FI").replace(/\\s+/g, "-");

      const appearances = (data ?? []).flatMap((section) =>
        (section.entries ?? [])
          .filter((entry) => entry.artist?.trim() && artistKey(entry.artist) === artistSlug)
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
      const name = appearances[0]?.artist ?? null;
      return { name, appearances };
    },
  });
