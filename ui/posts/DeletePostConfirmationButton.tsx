// ui/posts/DeletePostConfirmButton.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { deletePostAction } from "@/lib/posts/actions";

export function DeletePostConfirmButton({ id }: { id: number }) {
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
    <div>
      {/* The actual server-action form */}
      <form ref={formRef} action={deletePostAction}>
        <input type="hidden" name="id" value={id} />
      </form>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:underline"
      >
        Delete
      </button>

      {/* Minimal modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow">
            <h3 className="text-base font-semibold">Delete post?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This action can’t be undone.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border px-3 py-2 text-sm"
                disabled={isPending}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-60"
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