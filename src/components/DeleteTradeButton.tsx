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
        className="rounded-md px-2 py-1.5 text-sm text-slate-400 hover:text-red-600"
      >
        Delete
      </button>
    </form>
  );
}
