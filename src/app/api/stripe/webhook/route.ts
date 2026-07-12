// Stripe webhook: keeps each user's `tier` in sync with their subscription.
// Handles trial start, renewals, cancellations, and payment failures — events
// the user never triggers by visiting a page, so a webhook is required for
// production. Uses the Supabase admin client (no user session here).

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !adminConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Turn a subscription status into our tier.
  const tierFor = (status: string): "paid" | "free" =>
    status === "active" || status === "trialing" ? "paid" : "free";

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id;
        const customerId = typeof s.customer === "string" ? s.customer : null;
        if (userId) {
          await supabase
            .from("profiles")
            .update({ tier: "paid", stripe_customer_id: customerId })
            .eq("id", userId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        const tier =
          event.type === "customer.subscription.deleted"
            ? "free"
            : tierFor(sub.status);
        if (customerId) {
          await supabase
            .from("profiles")
            .update({ tier })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
      default:
        break; // ignore other events
    }
  } catch {
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
