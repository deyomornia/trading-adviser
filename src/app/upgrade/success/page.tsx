import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { paymongoConfigured, getCheckoutInfo, ACCESS_DAYS } from "@/lib/paymongo";
import { extendAccess } from "@/lib/billing";

// Always render fresh: this page verifies payment against the user's session.
export const dynamic = "force-dynamic";

// After PayMongo checkout, verify the remembered session belongs to THIS user
// and is paid, then grant access. Prefer the admin (service-role) client so it
// works even after billing columns are locked to server-only writes; falls back
// to the user session if the admin key isn't configured yet.
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
      const info = sessionId ? await getCheckoutInfo(sessionId) : null;

      // Only grant if the checkout is paid AND its metadata.user_id is this user.
      if (info?.paid && info.userId === user.id) {
        const writer = adminConfigured() ? createAdminClient() : supabase;
        await extendAccess(writer, user.id, ACCESS_DAYS);
        ok = true;
      } else if (profile?.paid_until && new Date(profile.paid_until) > new Date()) {
        // Already granted (e.g. the webhook beat us to it).
        ok = true;
      }
    }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      {ok ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">You’re all set 🎉</h1>
          <p className="mt-2 text-slate-600 dark:text-ink-300">
            {ACCESS_DAYS} days of Pro are unlocked. Enjoy the tracking tools.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/journal"
              className="rounded-md bg-slate-900 dark:bg-accent px-4 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
            >
              Open Trade Journal
            </Link>
            <Link
              href="/portfolio"
              className="rounded-md border border-slate-300 dark:border-ink-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-ink-100/90 hover:bg-slate-50 dark:hover:bg-ink-800"
            >
              View Portfolio
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Almost there</h1>
          <p className="mt-2 text-slate-600 dark:text-ink-300">
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
