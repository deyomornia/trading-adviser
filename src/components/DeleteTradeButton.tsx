"use client";

// Delete button that asks for confirmation before running the server action —
// prevents an accidental click from permanently removing a trade.

import { deleteTrade } from "@/app/journal/actions";

export default function DeleteTradeButton({ id }: { id: string }) {
  return (
    <form
      action={deleteTrade}
      onSubmit={(e) => {
        if (!confirm("Delete this trade? This can't be undone.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="Permanently delete this trade (asks for confirmation)"
        className="rounded-md px-2 py-1.5 text-sm text-slate-400 dark:text-ink-300/70 hover:text-red-600 dark:hover:text-red-400"
      >
        Delete
      </button>
    </form>
  );
}
