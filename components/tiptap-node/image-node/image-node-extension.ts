import { Image as TiptapImage } from "@tiptap/extension-image"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ImageNode as ImageNodeComponent } from "@/components/tiptap-node/image-node/image-node"

/**
 * Read-only image node: native lazy loading plus a skeleton NodeView shown
 * until the image finishes loading. Deliberately separate from the editable
 * editor's `Image.configure({ resize: {...} })` — that resize feature is
 * implemented via `@tiptap/extension-image`'s own built-in NodeView
 * (`ResizableNodeView`), which `addNodeView()` here would silently replace,
 * killing resize handles. Since resize handles have no purpose in read-only
 * content anyway, this extension is only used there.
 */
export const ImageNode = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      loading: {
        default: "lazy",
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeComponent)
  },
})
