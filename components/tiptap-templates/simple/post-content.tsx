"use client"

import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import type { JSONContent } from "@tiptap/core"

import { postSchemaExtensions } from "@/components/tiptap-templates/simple/post-schema-extensions"
import { ImageNode } from "@/components/tiptap-node/image-node/image-node-extension"

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

/**
 * Renders a saved post's Tiptap document for reading. Deliberately separate
 * from SimpleEditor: that component's toolbar, image upload, and drag/drop
 * handling extensions are dead weight for a reader who can't edit anything,
 * and were showing up as ~700KB of unnecessary JS on every post view.
 */
export function PostContent({ content }: PostContentProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    editorProps: {
      attributes: {
        class: "simple-editor",
      },
    },
    extensions: [...postSchemaExtensions, ImageNode],
    content,
  })

  return (
    <div className="simple-editor-wrapper simple-editor-wrapper--readonly">
      <EditorContext.Provider value={{ editor }}>
        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
