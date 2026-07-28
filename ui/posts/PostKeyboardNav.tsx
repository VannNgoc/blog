// ui/posts/PostKeyboardNav.tsx
"use client";

import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";

type PostKeyboardNavProps = {
  /** Href of the next (newer) post, or undefined if this is the newest visible to the viewer. */
  nextHref?: string;
  /** Href of the previous (older) post, or undefined if this is the oldest visible to the viewer. */
  previousHref?: string;
};

/**
 * Lets ArrowRight/ArrowLeft step to the next/previous post. Takes the same
 * hrefs the Previous/Next links already render from `getAdjacentPosts`
 * (access-filtered server-side), so a key press can never navigate anywhere
 * the visible links wouldn't already allow.
 *
 * react-hotkeys-hook's own defaults cover what a hand-rolled listener would
 * otherwise have to: it ignores the keypress while typing in an
 * input/textarea/select or contenteditable, and (with `ignoreModifiers`
 * left at its default `false`) a plain "right"/"left" binding only matches
 * when no modifier is held, so Cmd/Alt+Arrow (browser history,
 * caret-by-word movement) pass through untouched.
 *
 * Must be remounted per post (see the `key={post.id}` on this component in
 * page.tsx) rather than left to re-render with new props: this hook's
 * `enabled` option is only checked when its internal effect (re-)runs, and
 * that effect's dependencies don't include `enabled` — so if an instance
 * first mounts disabled (e.g. on the oldest post, where there's no
 * `previousHref`) and is later handed a real href without unmounting, the
 * listener never attaches. Forcing a fresh mount per post sidesteps that
 * gap entirely.
 */
export function PostKeyboardNav({ nextHref, previousHref }: PostKeyboardNavProps) {
  const router = useRouter();

  useHotkeys("right", () => router.push(nextHref!), { enabled: Boolean(nextHref) });
  useHotkeys("left", () => router.push(previousHref!), { enabled: Boolean(previousHref) });

  return null;
}
