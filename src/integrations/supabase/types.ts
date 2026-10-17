export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" }
  public: {
    Tables: {
      competitions: {
        Row: { created_at: string; id: string; year: number }
        Insert: { created_at?: string; id?: string; year: number }
        Update: { created_at?: string; id?: string; year?: number }
        Relationships: []
      }
      entries: {
        Row: { artist: string; audience_points: number; created_at: string; id: string; position: number; section_id: string; song: string | null; video_url: string | null; status: string | null }
        Insert: { artist: string; audience_points?: number; created_at?: string; id?: string; position?: number; section_id: string; song?: string | null; video_url?: string | null; status?: string | null }
        Update: { artist?: string; audience_points?: number; created_at?: string; id?: string; position?: number; section_id?: string; song?: string | null; video_url?: string | null; status?: string | null }
        Relationships: [{ foreignKeyName: "entries_section_id_fkey"; columns: ["section_id"]; isOneToOne: false; referencedRelation: "sections"; referencedColumns: ["id"] }]
      }
      juries: {
        Row: { created_at: string; id: string; name: string; position: number; section_id: string }
        Insert: { created_at?: string; id?: string; name: string; position?: number; section_id: string }
        Update: { created_at?: string; id?: string; name?: string; position?: number; section_id?: string }
        Relationships: [{ foreignKeyName: "juries_section_id_fkey"; columns: ["section_id"]; isOneToOne: false; referencedRelation: "sections"; referencedColumns: ["id"] }]
      }
      jury_votes: {
        Row: { entry_id: string; id: string; jury_id: string; points: number; rank: number }
        Insert: { entry_id: string; id?: string; jury_id: string; points?: number; rank: number }
        Update: { entry_id?: string; id?: string; jury_id?: string; points?: number; rank?: number }
        Relationships: [
          { foreignKeyName: "jury_votes_entry_id_fkey"; columns: ["entry_id"]; isOneToOne: false; referencedRelation: "entries"; referencedColumns: ["id"] },
          { foreignKeyName: "jury_votes_jury_id_fkey"; columns: ["jury_id"]; isOneToOne: false; referencedRelation: "juries"; referencedColumns: ["id"] }
        ]
      }
      sections: {
        Row: { competition_id: string; created_at: string; id: string; type: Database["public"]["Enums"]["section_type"]; video_url: string | null }
        Insert: { competition_id: string; created_at?: string; id?: string; type: Database["public"]["Enums"]["section_type"]; video_url?: string | null }
        Update: { competition_id?: string; created_at?: string; id?: string; type?: Database["public"]["Enums"]["section_type"]; video_url?: string | null }
        Relationships: [{ foreignKeyName: "sections_competition_id_fkey"; columns: ["competition_id"]; isOneToOne: false; referencedRelation: "competitions"; referencedColumns: ["id"] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { section_type: "artistijulkistus" | "esittely" | "karsinta" | "finaali" }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]
export type Tables<
  DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]["Views"]]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]["Views"]])[TableName] extends { Row: infer R } ? R : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Row: infer R } ? R : never
    : never
export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I } ? I : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][TableName] extends { Insert: infer I } ? I : never
    : never
export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U } ? U : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][TableName] extends { Update: infer U } ? U : never
    : never
export const Constants = { public: { Enums: { section_type: ["artistijulkistus", "esittely", "karsinta", "finaali"] } } } as const
