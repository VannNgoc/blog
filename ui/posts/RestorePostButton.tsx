"use client";

import { useFormStatus } from "react-dom";
import { restorePostAction } from "@/lib/posts/actions";

function SubmitButton() {
  // Reads the pending state of the form it sits in, so the label can change
  // without this component holding any state of its own.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted-foreground"
    >
      {pending ? "Restoring..." : "Restore"}
    </button>
  );
}

/** A plain form, so restoring works before JavaScript has loaded; the client
    half only adds the pending label. */
export function RestorePostButton({ id }: { id: number }) {
  return (
    <form action={restorePostAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton />
    </form>
  );
}
