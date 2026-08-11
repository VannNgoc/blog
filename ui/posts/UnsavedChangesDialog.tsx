"use client";

import { useEffect } from "react";

type UnsavedChangesDialogProps = {
  open: boolean;
  isSaving: boolean;
  onSaveAsDraft: () => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
};

export function UnsavedChangesDialog({
  open,
  isSaving,
  onSaveAsDraft,
  onDiscard,
  onKeepEditing,
}: UnsavedChangesDialogProps) {
  // Escape backs out the same way the safe button does — never the destructive
  // one, since a stray keypress shouldn't be able to throw away the post.
  useEffect(() => {
    if (!open || isSaving) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKeepEditing();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isSaving, onKeepEditing]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
    >
      <div className="w-full max-w-md rounded-xl border border-(--border-subtle) bg-white p-6 text-foreground shadow-lg dark:bg-zinc-900">
        <h3 id="unsaved-changes-title" className="text-lg font-semibold">
          Unsaved changes
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-(--muted-foreground)">
          Save this post as a draft to finish it later, or discard your changes?
        </p>

        {/* Discard sits apart from the safe actions on purpose (Apple HIG /
            GNOME HIG): distance from the destructive button is what stops a
            mis-aimed click at the primary action from deleting the work. */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
            disabled={isSaving}
          >
            Discard
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onKeepEditing}
              className="btn-cancel text-sm"
              disabled={isSaving}
            >
              Keep Editing
            </button>
            <button
              type="button"
              onClick={onSaveAsDraft}
              className="btn text-sm disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save as Draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
