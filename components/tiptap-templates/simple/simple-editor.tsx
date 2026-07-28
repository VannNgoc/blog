"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { Image as TiptapImage } from "@tiptap/extension-image"
import { FileHandler } from "@tiptap/extension-file-handler"
import { postSchemaExtensions } from "@/components/tiptap-templates/simple/post-schema-extensions"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { ImageNode } from "@/components/tiptap-node/image-node/image-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"

// --- Lib ---
import { getImageDimensions, handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

import type { JSONContent } from "@tiptap/core";
import {
  createPostHandler,
  editPostHandler,
} from "@/lib/posts/actions"

/** Default empty document so a fresh "create" editor starts blank. */
const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

/** Image node with native lazy loading — posts can carry several images, and
    most sit below the fold, so there's no reason to fetch them all up front. */
const Image = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      loading: {
        default: "lazy",
      },
      // Deliberately separate from the built-in `width`/`height` attrs: those
      // feed the resize NodeView's applyInitialSize(), which applies them as
      // literal, unclamped pixel styles every time the NodeView is freshly
      // constructed — not just on insert, but on any later remount ProseMirror
      // decides to do (e.g. after deleting a nearby node shifts positions).
      // Keeping the read-only skeleton's aspect-ratio data under its own name
      // means that code path never sees it, so the editable image always
      // falls back to measuring its live, correctly container-fit size.
      imgWidth: {
        default: null,
      },
      imgHeight: {
        default: null,
      },
    }
  },
})

export type SimpleEditorProps = {
  /** When provided, the editor saves as an edit of this post instead of creating a new one. */
  postId?: number
  /** Initial Tiptap document to load (edit / read views). Defaults to an empty doc. */
  initialContent?: JSONContent
  /** Initial title for the title field (edit view). */
  initialTitle?: string
  /** Initial description shown as the list preview (edit view). */
  initialDescription?: string
  /** Initial access level: 1 = public, 2 = private. Defaults to public. */
  initialAccess?: number
  /** When false, renders read-only: no toolbar, no title/access fields. Defaults to true. */
  editable?: boolean
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  onSave,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  onSave: () => void
  isMobile: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          modal={false}
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <Button variant="primary" onClick={onSave}>
          Save
        </Button>
      </ToolbarGroup>
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function SimpleEditor({
  postId,
  initialContent,
  initialTitle = "",
  initialDescription = "",
  initialAccess = 1,
  editable = true,
}: SimpleEditorProps = {}) {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [access, setAccess] = useState(initialAccess)
  const [isPending, startTransition] = useTransition()
  const toolbarRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      ...postSchemaExtensions,
      // Read-only content gets a skeleton-while-loading NodeView instead of
      // resize handles, which have no purpose (and no way to interact with)
      // once the editor isn't editable.
      editable
        ? Image.configure({
            resize: {
              enabled: true,
              directions: ['top', 'bottom', 'left', 'right'], // can be any direction or diagonal combination
              minWidth: 50,
              minHeight: 50,
              alwaysPreserveAspectRatio: true,
            }
          })
        : ImageNode,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      FileHandler.configure({
        allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
        onDrop: (editor, files, pos) => {
          files.forEach(async (file) => {
            const [url, dims] = await Promise.all([
              handleImageUpload(file), // same fn already used by ImageUploadNode
              getImageDimensions(file),
            ])
            editor.chain().insertContentAt(pos, {
              type: "image",
              attrs: { src: url, imgWidth: dims?.width ?? null, imgHeight: dims?.height ?? null },
            }).focus().run()
          })
        },
        onPaste: (editor, files) => {
          files.forEach(async (file) => {
            const [url, dims] = await Promise.all([
              handleImageUpload(file),
              getImageDimensions(file),
            ])
            editor.chain().insertContentAt(
              editor.state.selection.anchor,
              { type: "image", attrs: { src: url, imgWidth: dims?.width ?? null, imgHeight: dims?.height ?? null } }
            ).focus().run()
          })
        },
      }),
    ],
    content: initialContent ?? EMPTY_DOC,
  })

  // Measure the toolbar height into state instead of reading the ref during
  // render (which is unsafe and trips react-hooks/refs).
  const [toolbarHeight, setToolbarHeight] = useState(0)
  useEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    const update = () => setToolbarHeight(el.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [editable])

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarHeight,
  })

  // On desktop the mobile sub-views (highlighter/link) don't apply, so derive
  // the effective view during render instead of resetting state in an effect.
  const currentView = isMobile ? mobileView : "main"

  const handleSave = () => {
    if (!editor || isPending) return // bail out early
    // Serialize to a string here: passing the raw getJSON() object through the
    // server action drops every node's `attrs` (null-prototype objects that
    // React's serializer won't encode), losing textAlign and heading levels.
    const json = JSON.stringify(editor.getJSON())
    // Dispatch through a transition so Next applies the action's
    // revalidatePath() to the client router cache before redirecting —
    // otherwise the posts list can navigate to a stale cached entry.
    startTransition(async () => {
      try {
        if (postId != null) {
          await editPostHandler({ id: postId, json, title, description, access })
        } else {
          await createPostHandler({ json, title, description, access })
        }
      } catch (error) {
        // redirect() throws internally on success; only surface real failures
        if (!(error instanceof Error && error.message === "NEXT_REDIRECT")) {
          console.error("Failed to save post:", error)
        }
      }
    })
  }

  // Read-only render (single-post view): no toolbar, no metadata fields.
  if (!editable) {
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

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {currentView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              onSave={handleSave}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={currentView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <div className="mx-auto flex w-full max-w-[648px] flex-col gap-3 px-12 pt-4 sm:flex-row sm:items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            aria-label="Post title"
            className="w-full flex-1 rounded-md border border-zinc-300 bg-white p-2 text-lg font-medium text-zinc-900 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-blue-500"
          />
          <select
            value={access}
            onChange={(e) => setAccess(Number(e.target.value))}
            aria-label="Access level"
            className="rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
          >
            <option value={1}>Public</option>
            <option value={2}>Private</option>
          </select>
        </div>

        <div className="mx-auto w-full max-w-[648px] px-12 pt-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description for the posts list (optional)"
            aria-label="Post description"
            maxLength={300}
            rows={2}
            className="w-full resize-none rounded-md border border-zinc-300 bg-white p-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-blue-500"
          />
        </div>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
