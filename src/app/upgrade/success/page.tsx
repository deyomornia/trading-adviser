import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";

// After Stripe Checkout, verify the session server-side and flip the user to
// "paid" immediately. (The webhook also does this, but syncing here means the
// upgrade works even in local dev where webhooks aren't wired up.)
export default async function UpgradeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  let ok = false;

  if (session_id && stripeConfigured()) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["subscription"],
      });

      const sub = session.subscription as { status?: string } | null;
      const active = sub?.status === "active" || sub?.status === "trialing";

      if (active) {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({
              tier: "paid",
              stripe_customer_id:
                typeof session.customer === "string" ? session.customer : null,
            })
            .eq("id", user.id);
          ok = true;
        }
      }
    } catch {
      ok = false;
    }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      {ok ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">You’re all set 🎉</h1>
          <p className="mt-2 text-slate-600">
            Your free trial has started and Pro features are unlocked.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/journal"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open Trade Journal
            </Link>
            <Link
              href="/portfolio"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View Portfolio
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Almost there</h1>
          <p className="mt-2 text-slate-600">
            We couldn’t confirm your subscription just yet. If you completed
            checkout, it may take a moment — refresh this page, or check{" "}
            <Link href="/upgrade" className="underline">
              your plan
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
