"use client";

// Admin-only: permanently delete a user. Requires typing the user's email
// exactly, so it can never happen from a stray click.

import { deleteUserAccount } from "@/app/admin/actions";

export default function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  return (
    <form
      action={deleteUserAccount}
      onSubmit={(e) => {
        const typed = prompt(
          `This permanently deletes ${email} and ALL their data (journal, watchlist, account). ` +
            `It cannot be undone.\n\nType the user's email to confirm:`
        );
        if (typed !== email) {
          e.preventDefault();
          if (typed !== null) alert("Email didn't match — nothing was deleted.");
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-400 dark:text-ink-300/70 hover:text-red-600 dark:hover:text-red-400"
      >
        Delete
      </button>
    </form>
  );
}
