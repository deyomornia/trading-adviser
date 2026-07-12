"use server";

// Server actions that start a Stripe Checkout (subscription with 7-day trial)
// and open the Stripe billing portal for existing subscribers.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured, PRICE_ID, TRIAL_DAYS, siteUrl } from "@/lib/stripe";

export async function startCheckout() {
  if (!stripeConfigured()) redirect("/upgrade?error=Payments are not set up yet.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/upgrade");

  const stripe = getStripe();

  // Reuse an existing Stripe customer id if we have one; otherwise let Checkout
  // create the customer and we capture the id in the success sync / webhook.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: PRICE_ID(), quantity: 1 }],
    subscription_data: { trial_period_days: TRIAL_DAYS },
    client_reference_id: user.id, // ties the subscription back to our user
    customer: profile?.stripe_customer_id || undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email,
    success_url: `${siteUrl()}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/upgrade?canceled=1`,
    allow_promotion_codes: true,
  });

  if (session.url) redirect(session.url);
  redirect("/upgrade?error=Could not start checkout.");
}

export async function openBillingPortal() {
  if (!stripeConfigured()) redirect("/upgrade");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) redirect("/upgrade");

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteUrl()}/settings`,
  });

  redirect(session.url);
}
