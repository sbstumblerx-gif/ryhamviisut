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
