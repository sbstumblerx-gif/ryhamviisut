import Stripe from "stripe";
import { supporterPlan } from "./supporter-plan";

export function stripeClient() {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Maksupalvelun asetukset puuttuvat.");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
}

export function activeSupporterItem(subscription: Stripe.Subscription, now = Date.now()) {
  if (subscription.status !== "active") return undefined;
  return subscription.items.data.find((item) => item.price.id === supporterPlan.priceId &&
    item.current_period_end * 1000 > now);
}

export async function findSupporterCustomer(stripe: Stripe, userId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(userId)) throw new Error("Virheellinen käyttäjä.");
  const customers = await stripe.customers.search({
    query: `metadata['ryham_user_id']:'${userId}'`, limit: 10,
  });
  return customers.data.find((customer) => customer.metadata["ryham_user_id"] === userId);
}

export async function supporterStorage() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Pending schema is intentionally staged outside migrations until the journal is repaired.
  // This cast can be removed once the migration tool refreshes the generated database types.
  return supabaseAdmin as any;
}

export async function supporterSnapshot(userId: string, customerId?: string) {
  const stripe = stripeClient();
  const customer = customerId ? await stripe.customers.retrieve(customerId) : await findSupporterCustomer(stripe, userId);
  if (customer && (customer.deleted || customer.metadata["ryham_user_id"] !== userId)) {
    throw new Error("Tilaus ei kuulu kirjautuneelle käyttäjälle.");
  }
  let activeUntil: string | null = null;
  let cancelAtPeriodEnd = false;
  if (customer) {
    for await (const subscription of stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 100 })) {
      const item = activeSupporterItem(subscription);
      if (item && (!activeUntil || item.current_period_end * 1000 > Date.parse(activeUntil))) {
        activeUntil = new Date(item.current_period_end * 1000).toISOString();
        cancelAtPeriodEnd = subscription.cancel_at_period_end;
      }
    }
  }
  const db = await supporterStorage();
  const probe = await db.from("supporter_accounts").select("user_id").eq("user_id", userId).limit(1);
  let benefitsReady = !probe.error;
  if (customer && benefitsReady) {
    const updated = await db.from("supporter_accounts").upsert({ user_id: userId, customer_id: customer.id,
      active_until: activeUntil, checked_at: new Date().toISOString(), cancel_at_period_end: cancelAtPeriodEnd });
    benefitsReady = !updated.error;
  }
  return { subscribed: Boolean(activeUntil), activeUntil, cancelAtPeriodEnd, benefitsReady, testMode: !customer?.livemode,
    customerId: customer?.id ?? null };
}

export async function consumeAgentRequest(userId: string) {
  const snapshot = await supporterSnapshot(userId);
  if (!snapshot.benefitsReady) return { configured: false as const };
  const db = await supporterStorage();
  const { data, error } = await db.rpc("consume_agent_request", { _user_id: userId });
  const result = data?.[0];
  if (error || !result) throw new Error("Agentin käyttörajaa ei voitu tarkistaa.");
  return { configured: true as const, allowed: Boolean(result.allowed), used: Number(result.used), limit: Number(result.request_limit) };
}