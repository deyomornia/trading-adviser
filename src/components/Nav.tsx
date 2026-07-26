"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";

// The 6 pages of the app. Add or rename here and the whole menu updates.
const links = [
  { href: "/", label: "Dashboard" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/assets", label: "Asset Detail" },
  { href: "/trade-plan", label: "Trade Plan" },
  { href: "/journal", label: "Journal" },
  { href: "/portfolio", label: "Portfolio" },
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
      <div className="ml-auto flex items-center gap-3">
        {admin && (
          <Link
            href="/admin"
            className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Admin
          </Link>
        )}
        <span className="hidden text-sm text-slate-500 sm:inline">{email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
    >
      Sign in
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3">
        <span className="mr-4 font-semibold tracking-tight text-slate-900">
          Trading Adviser
        </span>
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
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
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
