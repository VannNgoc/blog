import type { JSONContent } from "@tiptap/core"

/**
 * A copy of in-progress editor work kept in the browser, so a crash, a closed
 * tab or an expired session can't lose more than a second of writing.
 *
 * Deliberately not an autosave to the database: for a public post that would
 * publish half-finished edits to readers while you type. This copy never
 * leaves the browser until you choose to save.
 *
 * Every storage access is wrapped: localStorage can be missing or throw
 * (private windows, blocked site data, quota), and losing the safety net must
 * never break the editor itself.
 */
export type UnsavedCopy = {
  json: JSONContent
  title: string
  description: string
  access: number
  /** When the copy was written, as epoch milliseconds. */
  savedAt: number
}

/** One key per post, plus one shared key for a post that hasn't been saved yet. */
export function unsavedCopyKey(postId: number | undefined) {
  return `recollections:unsaved:${postId ?? "new"}`
}

export function readUnsavedCopy(postId: number | undefined): UnsavedCopy | null {
  try {
    const raw = window.localStorage.getItem(unsavedCopyKey(postId))
    if (!raw) return null
    const copy = JSON.parse(raw) as Partial<UnsavedCopy>
    // A malformed entry is treated as absent rather than restored half-broken.
    if (
      typeof copy?.json !== "object" ||
      typeof copy.title !== "string" ||
      typeof copy.description !== "string" ||
      typeof copy.access !== "number" ||
      typeof copy.savedAt !== "number"
    ) {
      return null
    }
    return copy as UnsavedCopy
  } catch {
    return null
  }
}

export function writeUnsavedCopy(postId: number | undefined, copy: UnsavedCopy) {
  try {
    window.localStorage.setItem(unsavedCopyKey(postId), JSON.stringify(copy))
  } catch {
    // Storage unavailable or full: the editor keeps working without the net.
  }
}

export function clearUnsavedCopy(postId: number | undefined) {
  try {
    window.localStorage.removeItem(unsavedCopyKey(postId))
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
