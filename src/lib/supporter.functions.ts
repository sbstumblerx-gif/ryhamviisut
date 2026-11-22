import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supporterPlan, dailyRequestLimit, usageDay } from "./supporter-plan";

export const checkSupporter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const { supporterSnapshot } = await import("./supporter.server");
    try {
      const { customerId: _privateCustomerId, ...result } = await supporterSnapshot(context.userId);
      return result;
    } catch (error) {
      console.error("[Supporter] Verification failed", error instanceof Error ? error.name : "UnknownError");
      throw new Error("Tilausta ei voitu tarkistaa. Yritä uudelleen.");
    }
  });

export const createSupporterCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const { stripeClient, findSupporterCustomer, supporterSnapshot } = await import("./supporter.server");
    const stripe = stripeClient();
    const price = await stripe.prices.retrieve(supporterPlan.priceId);
    if (price.unit_amount !== supporterPlan.amountMinor || price.currency !== supporterPlan.currency || price.recurring?.interval !== supporterPlan.interval) {
      throw new Error("Tilauksen hintatiedot eivät täsmää.");
    }
    const state = await supporterSnapshot(context.userId);
    if (state.subscribed) throw new Error("Sinulla on jo voimassa oleva tukijatilaus.");
    // Never collect real money for vote/AI benefits until the pending schema is available.
    if (price.livemode && !state.benefitsReady) throw new Error("Tukijaetujen käyttöönotto on kesken. Maksaminen ei ole vielä mahdollista.");
    const existing = await findSupporterCustomer(stripe, context.userId);
    const customer = existing ?? await stripe.customers.create({ metadata: { ryham_user_id: context.userId } },
      { idempotencyKey: `ryham-supporter-customer-${context.userId}` });
    const origin = new URL(getRequest().url).origin;
    const session = await stripe.checkout.sessions.create({
      customer: customer.id, client_reference_id: context.userId,
      line_items: [{ price: supporterPlan.priceId, quantity: 1 }], mode: "subscription",
      subscription_data: { metadata: { ryham_user_id: context.userId } },
      success_url: `${origin}/tukija?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tukija?checkout=cancel`,
    }, { idempotencyKey: `ryham-checkout-${context.userId}-${Math.floor(Date.now() / 600000)}` });
    if (!session.url) throw new Error("Maksusivua ei voitu avata.");
    return { url: session.url, testMode: !price.livemode };
  });

export const verifySupporterCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().regex(/^cs_(test_|live_)?[a-zA-Z0-9]+$/).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const { stripeClient, supporterSnapshot } = await import("./supporter.server");
    const session = await stripeClient().checkout.sessions.retrieve(data.sessionId);
    if (session.client_reference_id !== context.userId || session.mode !== "subscription" || session.payment_status !== "paid" || typeof session.customer !== "string") {
      throw new Error("Maksua ei ole vahvistettu tälle tilille.");
    }
    const { customerId: _privateCustomerId, ...snapshot } = await supporterSnapshot(context.userId, session.customer);
    return snapshot;
  });

export const openSupporterPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { stripeClient, findSupporterCustomer } = await import("./supporter.server");
    const stripe = stripeClient();
    const customer = await findSupporterCustomer(stripe, context.userId);
    if (!customer) throw new Error("Tilillä ei ole tukijatilausta.");
    try {
      return { url: (await stripe.billingPortal.sessions.create({ customer: customer.id, return_url: `${new URL(getRequest().url).origin}/tukija` })).url };
    } catch {
      throw new Error("Tilauksen hallinta ei ole vielä käytössä Stripe-tilillä.");
    }
  });

export const getAgentAllowance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supporterSnapshot, supporterStorage } = await import("./supporter.server");
    const snapshot = await supporterSnapshot(context.userId);
    const db = await supporterStorage();
    const { data, error } = await db.from("agent_daily_usage").select("requests").eq("user_id", context.userId).eq("usage_date", usageDay()).maybeSingle();
    const limit = dailyRequestLimit(snapshot.subscribed);
    return { configured: snapshot.benefitsReady && !error, used: error ? null : (data?.requests ?? 0), limit,
      resetsAt: new Date(new Date(`${usageDay()}T00:00:00.000Z`).getTime() + 86400000).toISOString() };
  });