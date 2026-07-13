// Server-side PayMongo helpers (via REST — no SDK needed).
// PayMongo lets Philippine customers pay with GCash, GrabPay, Maya, or card.
// Secret keys are server-only (never NEXT_PUBLIC).

import crypto from "crypto";

const BASE = "https://api.paymongo.com/v1";

export const PRICE_CENTAVOS = 49900; // ₱499.00
export const ACCESS_DAYS = 30; // one payment grants 30 days
export const TRIAL_DAYS = 7; // new accounts get 7 days free

export function paymongoConfigured(): boolean {
  return Boolean(process.env.PAYMONGO_SECRET_KEY);
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export interface CheckoutSession {
  id: string;
  checkoutUrl: string;
}

// Create a hosted checkout for a single ₱499 / 30-day access purchase.
export async function createCheckoutSession(opts: {
  userId: string;
  email?: string;
}): Promise<CheckoutSession | null> {
  try {
    const res = await fetch(`${BASE}/checkout_sessions`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                currency: "PHP",
                amount: PRICE_CENTAVOS,
                name: "Trading Adviser Pro — 30 days",
                quantity: 1,
              },
            ],
            payment_method_types: ["gcash", "grab_pay", "paymaya", "card"],
            description: "Trading Adviser Pro access (30 days)",
            success_url: `${siteUrl()}/upgrade/success`,
            cancel_url: `${siteUrl()}/upgrade?canceled=1`,
            metadata: { user_id: opts.userId },
            ...(opts.email ? { billing: { email: opts.email } } : {}),
          },
        },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const id = j?.data?.id;
    const checkoutUrl = j?.data?.attributes?.checkout_url;
    if (!id || !checkoutUrl) return null;
    return { id, checkoutUrl };
  } catch {
    return null;
  }
}

// True once the checkout session has a paid payment.
export async function isCheckoutPaid(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/checkout_sessions/${sessionId}`, {
      headers: { Authorization: authHeader() },
    });
    if (!res.ok) return false;
    const j = await res.json();
    const payments = j?.data?.attributes?.payments ?? [];
    return payments.some(
      (p: { attributes?: { status?: string } }) => p?.attributes?.status === "paid"
    );
  } catch {
    return false;
  }
}

// Verify a webhook signature. Header format: "t=<ts>,te=<testSig>,li=<liveSig>".
// The signed payload is `${t}.${rawBody}`, HMAC-SHA256 with the webhook secret.
export function verifyWebhook(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => kv.split("=") as [string, string])
  );
  const t = parts.t;
  const provided = parts.li || parts.te; // live signature preferred, else test
  if (!t || !provided) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
