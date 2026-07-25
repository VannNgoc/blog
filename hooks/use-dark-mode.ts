"use client"
import { useSyncExternalStore } from "react"

// Subscribe to changes of the `.dark` class on <html> so callers stay in sync
// no matter what flips the theme (this hook's own toggle, the init script, etc.).
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

export function useDarkMode() {
  // Read the current theme straight from the DOM (the external source of
  // truth) rather than mirroring it into local state inside an effect.
  const isDarkMode = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false
  )

  const toggleDarkMode = () => {
    const next = !isDarkMode
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }

  return { isDarkMode, toggleDarkMode }
}
