"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The 6 pages of the app. Add or rename here and the whole menu updates.
const links = [
  { href: "/", label: "Dashboard" },
  { href: "/assets", label: "Asset Detail" },
  { href: "/trade-plan", label: "Trade Plan" },
  { href: "/journal", label: "Journal" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/settings", label: "Settings" },
];

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
      </nav>
    </header>
  );
}
