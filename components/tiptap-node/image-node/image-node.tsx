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
  const { src, alt, title, imgWidth, imgHeight, loading } = node.attrs
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  // Reserves the exact space the image will occupy so the skeleton matches
  // its final size and nothing shifts on load. Older posts saved before
  // dimensions were captured fall back to the fixed min-height in the CSS.
  const style = imgWidth && imgHeight ? { aspectRatio: `${imgWidth} / ${imgHeight}` } : undefined

  // withPostImageUrls marks the first image in a post "eager": it's almost
  // always the LCP candidate, so lazy-loading it (the default for every
  // other image) only delays the metric it's being measured by.
  const isEager = loading === "eager"

  if (errored) {
    return (
      <NodeViewWrapper className="tiptap-image-node" data-loaded style={style}>
        <div className="tiptap-image-node-error" role="img" aria-label={alt || "Image failed to load"}>
          <span>Image failed to load{alt ? `: ${alt}` : ""}</span>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="tiptap-image-node" data-loaded={loaded} style={style}>
      {!loaded && <div className="skeleton tiptap-image-node-skeleton" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        title={title}
        loading={isEager ? "eager" : "lazy"}
        fetchPriority={isEager ? "high" : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={loaded ? undefined : "tiptap-image-node-hidden"}
      />
    </NodeViewWrapper>
  )
}
