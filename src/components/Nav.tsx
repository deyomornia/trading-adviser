"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

// The pages of the app. Add or rename here and the whole menu updates.
const links = [
  { href: "/", label: "Dashboard" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/assets", label: "Asset Detail" },
  { href: "/trade-plan", label: "Trade Plan" },
  { href: "/journal", label: "Journal" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/support", label: "Support" },
  { href: "/settings", label: "Settings" },
];

// True only once Deo has added the Supabase keys to .env.local.
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function AuthArea() {
  const [email, setEmail] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    const supabase = createClient();

    // Visibility only — /admin is enforced server-side regardless.
    const loadRole = async (userId: string | undefined) => {
      if (!userId) {
        setAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      setAdmin(data?.role === "admin");
    };

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
      loadRole(data.user?.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      loadRole(session?.user?.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Before Supabase is wired up, or while loading, show nothing on the right.
  if (!supabaseConfigured || !ready) return null;

  if (email) {
    return (
      <div className="ml-auto flex items-center gap-2">
        {admin && (
          <Link
            href="/admin"
            className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-accent/10 dark:text-accent dark:hover:bg-accent/20"
          >
            Admin
          </Link>
        )}
        <span className="hidden text-sm text-slate-500 dark:text-ink-300 sm:inline">{email}</span>
        <ThemeToggle />
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <ThemeToggle />
      <Link
        href="/login"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-accent dark:text-ink-950 dark:hover:bg-accent/90"
      >
        Sign in
      </Link>
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white dark:border-ink-700 dark:bg-ink-900">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3">
        <Link href="/" className="mr-4 flex items-center gap-2">
          <Logo />
          <span className="font-semibold tracking-tight text-slate-900 dark:text-ink-100">
            DG Trading Adviser
          </span>
          <span className="rounded border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Beta
          </span>
        </Link>
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                "rounded-md px-3 py-1.5 text-sm transition-colors " +
                (active
                  ? "bg-slate-900 text-white dark:bg-accent dark:text-ink-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-100")
              }
            >
              {link.label}
            </Link>
          );
        })}
        <AuthArea />
      </nav>
    </header>
  );
}
