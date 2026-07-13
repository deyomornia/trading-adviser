import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { paymongoConfigured, isCheckoutPaid, ACCESS_DAYS } from "@/lib/paymongo";
import { extendAccess } from "@/lib/billing";

// Always render fresh: this page verifies payment against the user's session.
export const dynamic = "force-dynamic";

// After PayMongo checkout, verify the remembered session and grant access.
// (The webhook also does this; syncing here makes it work in local dev too.)
export default async function UpgradeSuccessPage() {
  let ok = false;

  if (paymongoConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("pending_checkout_id, paid_until")
        .eq("id", user.id)
        .single();

      const sessionId = profile?.pending_checkout_id;
      if (sessionId && (await isCheckoutPaid(sessionId))) {
        await extendAccess(supabase, user.id, ACCESS_DAYS);
        ok = true;
      } else if (profile?.paid_until && new Date(profile.paid_until) > new Date()) {
        // Already granted (e.g. webhook beat us to it).
        ok = true;
      }
    }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      {ok ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">You’re all set 🎉</h1>
          <p className="mt-2 text-slate-600">
            {ACCESS_DAYS} days of Pro are unlocked. Enjoy the tracking tools.
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
            We couldn’t confirm your payment just yet. If you completed it, give it
            a moment and refresh — or check{" "}
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
