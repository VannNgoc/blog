"use client"

import { useState } from "react"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewWrapper } from "@tiptap/react"

/**
 * Read-only image NodeView: shows a shimmering skeleton in place of the image
 * until it finishes loading. Images here are served through the auth-gated
 * `/api/file` route (not a static asset), so the fetch is slow enough that a
 * placeholder is worth it.
 */
export const ImageNode: React.FC<NodeViewProps> = ({ node }) => {
  const { src, alt, title, width, height } = node.attrs
  const [loaded, setLoaded] = useState(false)

  // Reserves the exact space the image will occupy so the skeleton matches
  // its final size and nothing shifts on load. Older posts saved before
  // dimensions were captured fall back to the fixed min-height in the CSS.
  const style = width && height ? { aspectRatio: `${width} / ${height}` } : undefined

  return (
    <NodeViewWrapper className="tiptap-image-node" data-loaded={loaded} style={style}>
      {!loaded && <div className="skeleton tiptap-image-node-skeleton" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        title={title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={loaded ? undefined : "tiptap-image-node-hidden"}
      />
    </NodeViewWrapper>
  )
}
