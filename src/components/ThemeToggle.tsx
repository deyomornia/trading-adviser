"use client";

// Dark/light toggle. Flips the <html> class instantly (no reload) and writes
// the cookie so the server renders the same mode on the next visit.

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
    setDark(next);
  }

  // Render a stable placeholder until mounted (avoids hydration mismatch).
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-ink-300 dark:hover:bg-ink-800"
    >
      {dark === null ? "◐" : dark ? "☀︎" : "☾"}
    </button>
  );
}
