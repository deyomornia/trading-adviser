"use client";

// Password input with a show/hide toggle, so users can verify what they typed.

import { useState } from "react";

export default function PasswordField({
  name,
  label,
  autoComplete,
  minLength,
  hint,
}: {
  name: string;
  label: string;
  autoComplete?: string;
  minLength?: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-ink-100/90">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className="w-full rounded-md border border-slate-300 dark:border-ink-700 bg-white dark:bg-ink-950 px-3 py-2 pr-10 text-sm text-slate-900 dark:text-ink-100 outline-none focus:border-slate-500 dark:focus:border-accent"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Hide password" : "Show password"}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:text-ink-300/70 dark:hover:text-ink-100"
        >
          {visible ? "🙈" : "👁"}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-ink-300/70">{hint}</p>}
    </div>
  );
}
