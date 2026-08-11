/**
 * Bridge for components that sit outside the editor's React tree but can still
 * throw away in-progress work — the header's Sign Out button being the case
 * that matters. Context can't reach them (the header isn't a descendant of the
 * editor), so the mounted editor registers its handler here instead.
 *
 * Sign Out can't rely on the `beforeunload` prompt: it destroys the session
 * *before* navigating, so by the time the browser asks "leave this page?" the
 * user is already signed out and can no longer save what they'd lose.
 */

/** Called with the action to run once the user has resolved the unsaved work. */
type ExitHandler = (proceed: () => void) => void;

let activeHandler: ExitHandler | null = null;

/** Editors call this on mount, and with `null` on unmount. */
export function registerExitGuard(handler: ExitHandler | null) {
  activeHandler = handler;
}

/** Runs `proceed` straight away when no editor is guarding (or nothing is
    dirty); otherwise the registered editor takes over and decides. */
export function guardedExit(proceed: () => void) {
  if (activeHandler) activeHandler(proceed);
  else proceed();
}
