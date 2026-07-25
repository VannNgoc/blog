"use client"
import { useDarkMode } from "@/hooks/use-dark-mode"
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon"
import { SunIcon } from "@/components/tiptap-icons/sun-icon"

export function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  return (
    <button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      className="rounded-md p-1.5 text-zinc-100 transition hover:bg-zinc-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
    >
      {isDarkMode ? <MoonStarIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
    </button>
  )
}
