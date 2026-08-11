"use client"
import { useDarkMode } from "@/hooks/use-dark-mode"
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon"
import { SunIcon } from "@/components/tiptap-icons/sun-icon"

export function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  // The `after` pseudo-element is an invisible 44px touch target laid over this
  // 32px button. Growing the button itself would push the header taller on
  // phones; a pseudo-element extends only the hit area, so the icon and the
  // header keep their current size.
  return (
    <button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      className="relative rounded-md p-1.5 text-zinc-100 transition after:absolute after:-inset-1.5 after:content-[''] hover:bg-zinc-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
    >
      {isDarkMode ? <MoonStarIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
    </button>
  )
}
