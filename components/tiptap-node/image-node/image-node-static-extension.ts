import { Image as TiptapImage } from "@tiptap/extension-image"
import { mergeAttributes } from "@tiptap/core"

/**
 * Statically-rendered counterpart to `ImageNode` (image-node-extension.ts).
 * Same attrs, but a plain `renderHTML` instead of a React NodeView, so
 * `@tiptap/static-renderer` can turn a post's JSON straight into real
 * `<img>` markup on the server — no client JS has to run before the image
 * exists in the document. Produces the same skeleton + `<img>` DOM shape
 * the NodeView renders (see image-node.scss), so the stylesheet and
 * `PostImageLoader`'s progressive enhancement both apply unchanged.
 */
export const StaticImageNode = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      loading: {
        default: "lazy",
      },
      imgWidth: {
        default: null,
      },
      imgHeight: {
        default: null,
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const { loading, imgWidth, imgHeight, ...rest } = HTMLAttributes
    const isEager = loading === "eager"
    // Deliberately NOT marked `tiptap-image-node-hidden` here, unlike the
    // editor's NodeView. That class is `opacity: 0`, and only a client-side
    // effect removes it — which pinned every reader-facing image's paint to
    // hydration finishing, since an element at `opacity: 0` is not a Largest
    // Contentful Paint candidate. The image would arrive early (it's even
    // preloaded, below) and then sit invisible waiting on JS. The skeleton
    // shares this element's grid cell, so an image that hasn't decoded yet
    // still shows the placeholder underneath; letting the image paint the
    // instant it decodes needs no JavaScript at all.
    const imgAttrs: Record<string, unknown> = mergeAttributes(rest, {
      loading: isEager ? "eager" : "lazy",
      // Below-the-fold images are frequently many megapixels; decoding those
      // off the main thread keeps them from janking the page while reading.
      ...(isEager ? {} : { decoding: "async" }),
    })
    // Only set on the LCP candidate: an explicit "high" is what tells the
    // browser (and, server-rendered via React, triggers an automatic
    // <link rel="preload">) to fetch this image before anything else.
    if (isEager) imgAttrs.fetchPriority = "high"

    return [
      "div",
      {
        class: "tiptap-image-node",
        "data-loaded": "false",
        ...(imgWidth && imgHeight
          ? { style: `aspect-ratio: ${imgWidth} / ${imgHeight}` }
          : {}),
      },
      ["div", { class: "skeleton tiptap-image-node-skeleton", "aria-hidden": "true" }],
      ["img", imgAttrs],
    ]
  },
})
