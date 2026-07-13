// PayMongo webhook: grants access when a checkout is paid. Required for
// production (the success page covers local dev). Uses the Supabase admin
// (service-role) client since there is no user session here.

import { NextResponse } from "next/server";
import { verifyWebhook, ACCESS_DAYS } from "@/lib/paymongo";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { extendAccess } from "@/lib/billing";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("paymongo-signature") ?? "";

  if (!verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let event: {
    data?: { attributes?: { type?: string; data?: { attributes?: { metadata?: { user_id?: string } } } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const type = event.data?.attributes?.type;
  const userId = event.data?.attributes?.data?.attributes?.metadata?.user_id;

  // Grant 30 days when a checkout session's payment succeeds.
  if (
    (type === "checkout_session.payment.paid" || type === "payment.paid") &&
    userId
  ) {
    try {
      await extendAccess(createAdminClient(), userId, ACCESS_DAYS);
    } catch {
      return NextResponse.json({ error: "handler failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
