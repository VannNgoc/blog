"use client"

import { useEffect, useRef, type ReactNode } from "react"

type PostImageLoaderProps = {
  className: string
  children: ReactNode
}

/**
 * Progressively enhances the statically-rendered post body: once each image
 * finishes loading (or immediately, if it's already cached), removes its
 * skeleton placeholder and fades the image in. This is the one piece of the
 * read-only post view that still needs to run client-side — everything else
 * comes from the server already rendered, so this component only carries
 * the tiny load-listener effect, not an editor.
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
