// ui/posts/DeletePostConfirmButton.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { deletePostAction } from "@/lib/posts/actions";

export function DeletePostConfirmButton({
  id,
  redirectTo,
  label,
}: {
  id: number;
  /** Where to land afterwards. Omit when deleting from a list — you stay on it.
      Pass a destination when deleting from the post's own page, which would
      otherwise leave you on a route whose post no longer exists. */
  redirectTo?: string;
  /** Renders the trigger as a labelled action beside its icon, sized and
      coloured to sit alongside other text actions. Without it the trigger stays
      the bare icon a dense card needs.

      The labelled form is also neutral until hovered rather than red on sight.
      A destructive action should be findable, not loud: red-by-default draws
      the eye to the one control you'd least like mistaken for the primary one,
      and reserving the colour for hover and focus puts the warning exactly
      where the decision happens. */
  label?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(() => {
      // submit the form that has action={deletePostAction}
      formRef.current?.requestSubmit();
    });
  }

  return (
    <div className="flex items-center">
      {/* The actual server-action form */}
      <form ref={formRef} action={deletePostAction}>
        <input type="hidden" name="id" value={id} />
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      </form>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          label
            ? "inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-red-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--muted-foreground) dark:hover:text-red-400"
            : "inline-flex items-center text-red-600 hover:text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--muted-foreground) dark:text-red-400 dark:hover:text-red-300"
        }
        aria-label={label ? undefined : "Delete"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
          className={label ? "size-4 shrink-0" : "size-6"}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
        {label}
      </button>

      {/* Minimal modal */}
      {open && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-4 text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-base font-semibold text-foreground">Delete post?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This action can’t be undone.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
                disabled={isPending}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-600"
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}