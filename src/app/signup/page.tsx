import Link from "next/link";
import { signup } from "@/app/auth/actions";
import PasswordField from "@/components/PasswordField";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-ink-100">Create account</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-ink-300">
        Free to start. This is a decision-support tool, not financial advice.
      </p>

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
        <PasswordField
          name="password"
          label="Password"
          autoComplete="new-password"
          minLength={6}
          hint="At least 6 characters."
        />
        <PasswordField
          name="confirm"
          label="Confirm password"
          autoComplete="new-password"
          minLength={6}
          hint="Type the same password again so a typo can't lock you out."
        />
        <button
          formAction={signup}
          title="Create your DG Trading Adviser account"
          className="w-full rounded-md bg-slate-900 dark:bg-accent px-3 py-2 text-sm font-medium text-white dark:text-ink-950 hover:bg-slate-800 dark:hover:bg-accent/90"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-ink-300">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 dark:text-ink-100 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
