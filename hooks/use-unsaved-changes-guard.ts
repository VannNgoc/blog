"use client"

import { useCallback, useEffect, useState } from "react"
import { registerExitGuard } from "@/lib/unsaved-changes"

/** A blocked way out of the editor: what to do once the user has decided, plus
    the destination when there is one (so "Save as Draft" can land there). */
type PendingExit = { href?: string; run: () => void }

/**
 * Guards against losing in-progress edits. Three exit paths are covered:
 *  - Browser-level unload (tab close/refresh) via `beforeunload`. The native
 *    dialog only offers Leave/Cancel — the browser doesn't allow a custom
 *    "Save as Draft" action here, so this is best-effort.
 *  - In-app navigation, by intercepting clicks on same-origin links in the
 *    capture phase while dirty, so the custom confirm dialog covers header
 *    nav, prev/next post links, etc.
 *  - Non-link exits that register through `lib/unsaved-changes` (Sign Out).
 *
 * `isDirty` is taken as a function (not a boolean) so callers with fast-changing
 * dirty state (e.g. every keystroke) don't need to re-run the click/unload
 * effects on every change — only the latest check matters, read at click time.
 */
export function useUnsavedChangesGuard({
  isDirty,
  onNavigate,
}: {
  isDirty: () => boolean
  onNavigate: (href: string) => void
}) {
  const [pending, setPending] = useState<PendingExit | null>(null)

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty()) return
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as HTMLElement | null)?.closest?.("a")
      if (!anchor) return
      if (anchor.target && anchor.target !== "_self") return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return

      const destination = url.pathname + url.search
      if (destination === window.location.pathname + window.location.search) return
      if (!isDirty()) return

      e.preventDefault()
      e.stopPropagation()
      setPending({ href: destination, run: () => onNavigate(destination) })
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [isDirty, onNavigate])

  // Let non-link exits (Sign Out) route through the same dialog.
  useEffect(() => {
    registerExitGuard((proceed) => {
      if (!isDirty()) {
        proceed()
        return
      }
      setPending({ run: proceed })
    })
    return () => registerExitGuard(null)
  }, [isDirty])

  /** Navigate now if there's nothing to lose, otherwise open the confirm dialog. */
  const requestNavigation = useCallback(
    (href: string) => {
      if (!isDirty()) {
        onNavigate(href)
        return
      }
      setPending({ href, run: () => onNavigate(href) })
    },
    [isDirty, onNavigate]
  )

  const discardAndLeave = useCallback(() => {
    pending?.run()
    setPending(null)
  }, [pending])

  const keepEditing = useCallback(() => setPending(null), [])

  return { pending, requestNavigation, discardAndLeave, keepEditing }
}
