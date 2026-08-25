// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"

// --- Tiptap Node ---
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"

/**
 * Extensions that define how a post's saved Tiptap JSON is parsed and
 * rendered — shared between the editable SimpleEditor and the read-only
 * PostContent viewer so the two can never drift on what node/mark types a
 * stored post can contain. Anything editing-only (toolbar UI, image upload,
 * drag/drop/paste handling) stays out of this list, so read-only content
 * doesn't carry the editor's machinery.
 *
 * That is NOT the same as saying those node types can't reach a saved
 * document — they can. `imageUpload` inserts a placeholder that persists if
 * the author saves without choosing a file, and `renderToReactElement` throws
 * on any node type it has no extension for, so one abandoned upload widget
 * made a whole post unreadable. `stripEditorOnlyNodes` drops them on both the
 * write and read paths; anything editor-only must stay in sync with that set.
 *
 * The `image` node is deliberately NOT here: SimpleEditor and PostContent
 * each register their own variant (resizable `Image` vs. skeleton-NodeView
 * `ImageNode`), so exactly one of the two is ever active — see the comment
 * on `ImageNode` for why they can't be merged into one extension.
 */
export const postSchemaExtensions = [
  StarterKit.configure({
    horizontalRule: false,
    link: {
      openOnClick: false,
      enableClickSelection: true,
    },
  }),
  HorizontalRule,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  Typography,
  Superscript,
  Subscript,
  Selection,
]
