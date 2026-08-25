"use client"

import { useEffect, useRef, type ReactNode } from "react"

type PostImageLoaderProps = {
  className: string
  children: ReactNode
}

/**
 * Progressively enhances the statically-rendered post body: once each image
 * finishes loading (or immediately, if it's already cached), retires its
 * skeleton placeholder.
 *
 * Note what this deliberately does *not* do any more — reveal the image. The
 * image is visible from the server-rendered HTML onward and paints as soon as
 * it decodes; the skeleton simply sits in the same grid cell underneath until
 * then. Gating the reveal on this effect meant the paint waited for the whole
 * client bundle to download and hydrate, which is a poor trade for a fade.
 * The skeleton removal below is pure cleanup: it's off the critical path, so
 * if this never runs, readers still see every image.
 */
export function PostImageLoader({ className, children }: PostImageLoaderProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const reveal = (wrapper: Element, img: HTMLImageElement) => {
      wrapper.setAttribute("data-loaded", "true")
      wrapper.querySelector(".tiptap-image-node-skeleton")?.remove()
      img.classList.remove("tiptap-image-node-hidden")
    }

    root.querySelectorAll<HTMLImageElement>(".tiptap-image-node img").forEach((img) => {
      const wrapper = img.closest(".tiptap-image-node")
      if (!wrapper) return

      if (img.complete) {
        reveal(wrapper, img)
      } else {
        img.addEventListener("load", () => reveal(wrapper, img), { once: true })
        img.addEventListener("error", () => reveal(wrapper, img), { once: true })
      }
    })
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
