"use client";

// Slim beta notice under the header. Server decides whether to render it
// (cookie `beta_banner` ≠ "off"); dismissing hides it instantly and remembers
// the choice for a year.

import Link from "next/link";
import { useState } from "react";

export default function BetaBanner() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss() {
    document.cookie = "beta_banner=off; path=/; max-age=31536000; samesite=lax";
    setHidden(true);
  }

  return (
    <div className="border-b border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm text-amber-800 dark:text-amber-300">
        <span className="min-w-0 flex-1">
          <strong>Beta:</strong> DG Trading Adviser is still being refined — you
          may spot rough edges.{" "}
          <Link href="/support" className="font-medium underline">
            Tell us what to improve →
          </Link>
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss beta notice"
          className="shrink-0 rounded px-1.5 text-amber-800/70 hover:text-amber-900 dark:text-amber-300/70 dark:hover:text-amber-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
