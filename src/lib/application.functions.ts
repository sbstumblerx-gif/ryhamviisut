import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const applicationSchema = z.object({
  applicationType: z.enum(["kilpailija", "raati", "valiesitys"]),
  applicantName: z.string().trim().min(1).max(160),
  contactEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  payload: z.record(z.string(), z.unknown()),
});

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => applicationSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const trackingToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const { data: row, error } = await (supabaseAdmin as any)
      .from("applications")
      .insert({
        application_type: data.applicationType,
        applicant_name: data.applicantName,
        contact_email: data.contactEmail || null,
        payload: data.payload,
        tracking_token: trackingToken,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error("Hakemuksen tallentaminen epäonnistui. Yritä myöhemmin uudelleen.");
    return { ok: true, trackingToken, applicationId: row.id, createdAt: row.created_at };
  });

export const getApplicationReply = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ trackingToken: z.string().min(50).max(100) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("applications")
      .select("application_type, applicant_name, admin_reply, replied_at, created_at")
      .eq("tracking_token", data.trackingToken)
      .maybeSingle();
    if (error) throw new Error("Hakemuksen tarkistus epäonnistui.");
    if (!row) throw new Error("Hakemusta ei löytynyt tällä seurantakoodilla.");
    return { ok: true, application: row };
  });
