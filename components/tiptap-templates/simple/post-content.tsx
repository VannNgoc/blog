import { renderToReactElement } from "@tiptap/static-renderer"
import type { JSONContent } from "@tiptap/core"

import { stripEditorOnlyNodes } from "@/lib/tiptap-content"

import { postSchemaExtensions } from "@/components/tiptap-templates/simple/post-schema-extensions"
import { StaticImageNode } from "@/components/tiptap-node/image-node/image-node-static-extension"
import { PostImageLoader } from "@/components/tiptap-node/image-node/post-image-loader"

// --- Styles ---
// Same stylesheet SimpleEditor uses: it already carries the
// `.simple-editor-wrapper--readonly` rules this component renders with.
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"
import "@/components/tiptap-templates/simple/simple-editor.scss"

export type PostContentProps = {
  content: JSONContent
}

const staticExtensions = [...postSchemaExtensions, StaticImageNode]

/**
 * Renders a saved post's Tiptap document for reading. Statically rendered
 * on the server via `@tiptap/static-renderer` instead of mounting a live
 * ProseMirror editor: the read path never edits anything, so paying for the
 * editor's client JS just to display text and images was pure overhead —
 * and worse, meant the whole post body (including the LCP image) didn't
 * exist in the DOM until that JS downloaded and ran, making it invisible to
 * the browser's HTML preloader. `PostImageLoader` is the only client-side
 * piece left, and it only runs the skeleton-while-loading effect on images.
 */
export function PostContent({ content }: PostContentProps) {
  // Posts saved before the write-side guard existed can still contain an
  // editor-only placeholder node, which `renderToReactElement` has no
  // extension for and throws on — turning one abandoned upload widget into a
  // whole unreadable post. Strip here too so the read path can't be broken by
  // whatever is already in the database.
  const rendered = renderToReactElement({
    content: stripEditorOnlyNodes(content),
    extensions: staticExtensions,
  })

  return (
    <div className="simple-editor-wrapper simple-editor-wrapper--readonly">
      <div className="simple-editor-content" role="presentation">
        <PostImageLoader className="tiptap ProseMirror simple-editor">
          {rendered}
        </PostImageLoader>
      </div>
    </div>
  )
}
