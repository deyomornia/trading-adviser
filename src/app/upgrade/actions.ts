"use server";

// Starts a PayMongo hosted checkout for a 30-day Pro purchase and remembers the
// session id on the user's profile so the success page can verify payment.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, paymongoConfigured } from "@/lib/paymongo";

export async function startCheckout() {
  if (!paymongoConfigured()) redirect("/upgrade?error=Payments are not set up yet.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/upgrade");

  const session = await createCheckoutSession({
    userId: user.id,
    email: user.email ?? undefined,
  });
  if (!session) redirect("/upgrade?error=Could not start checkout. Please try again.");

  // Remember which checkout to verify on return.
  await supabase
    .from("profiles")
    .update({ pending_checkout_id: session.id })
    .eq("id", user.id);

  redirect(session.checkoutUrl);
}
