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
  const { src, alt, title } = node.attrs
  const [loaded, setLoaded] = useState(false)

  return (
    <NodeViewWrapper className="tiptap-image-node" data-loaded={loaded}>
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
