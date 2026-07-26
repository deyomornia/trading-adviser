import Link from "next/link";
import { login } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-ink-300">
        Access your trade plans, journal, and portfolio.
      </p>

      {message && (
        <p className="mt-4 rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <form className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-ink-100/90">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-ink-700 px-3 py-2 text-sm focus:border-slate-500 dark:focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-ink-100/90">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-slate-300 dark:border-ink-700 px-3 py-2 text-sm focus:border-slate-500 dark:focus:border-accent focus:outline-none"
          />
        </div>
        <button
          formAction={login}
          className="w-full rounded-md bg-slate-900 dark:bg-accent px-3 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-ink-300">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-slate-900 dark:text-ink-100 underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
