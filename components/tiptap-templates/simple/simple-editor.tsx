"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useHotkeys } from "react-hotkeys-hook"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import type { Editor } from "@tiptap/react"

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
// The --tt-* design tokens every editor stylesheet here resolves against.
// Loaded here rather than globally (see app/globals.css) since only the
// editor and the read-only post body (post-content.tsx) ever reference them.
import "@/styles/_variables.scss"
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
import { ImageAltButton } from "@/components/tiptap-ui/image-alt-button"
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
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { useThrottledCallback } from "@/hooks/use-throttled-callback"

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"
import { UnsavedChangesDialog } from "@/ui/posts/UnsavedChangesDialog"

// --- Lib ---
import { getImageDimensions, handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"
import { ACCESS_DRAFT } from "@/lib/constants"
import { postMetaSchema } from "@/schemas/post-form"
import {
  clearUnsavedCopy,
  readUnsavedCopy,
  writeUnsavedCopy,
  type UnsavedCopy,
} from "@/lib/unsaved-copy"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

import type { JSONContent } from "@tiptap/core";
import {
  createPostHandler,
  editPostHandler,
  type SaveResult,
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
  /** Initial access level: 1 = public, 2 = private, 4 = draft. Defaults to public. */
  initialAccess?: number
  /** When false, renders read-only: no toolbar, no title/access fields. Defaults to true. */
  editable?: boolean
}

const MainToolbarContent = ({
  editor,
  onHighlighterClick,
  onLinkClick,
  onSave,
  onCancel,
  isMobile,
  savedAt,
}: {
  editor: Editor | null
  onHighlighterClick: () => void
  onLinkClick: () => void
  onSave: () => void
  onCancel: () => void
  isMobile: boolean
  /** Time of the last save in place (Ctrl/Cmd+S), shown beside Save. */
  savedAt: Date | null
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
        <ImageAltButton editor={editor} />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        {/* Always rendered so screen readers hear each new save announced. */}
        <span aria-live="polite" className="px-1 text-xs text-muted-foreground whitespace-nowrap">
          {savedAt
            ? `Saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : null}
        </span>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
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
  // The post as last saved. Both start from the props but move on a save in
  // place: a new post gains an id (so the next save edits it instead of
  // creating a duplicate), and Cancel follows the access level actually stored.
  const [savedPostId, setSavedPostId] = useState(postId)
  const [savedAccess, setSavedAccess] = useState(initialAccess)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [recovery, setRecovery] = useState<UnsavedCopy | null>(null)
  // True while the restore banner is waiting for an answer. Until then the
  // stored copy is left alone: writing (or clearing) it would replace the very
  // work the banner is offering back, and a reload would lose it.
  const recoveryPendingRef = useRef(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    // Offer back whatever a previous session left unsaved, but only when it
    // actually differs from what the server just loaded. Done here, once the
    // editor holds that content, rather than in an effect: this is the editor
    // reporting in, which is what a state update is allowed to respond to.
    onCreate: ({ editor }) => {
      if (!editable) return
      const copy = readUnsavedCopy(postId)
      if (!copy) return
      const differs =
        copy.title !== initialTitle ||
        copy.description !== initialDescription ||
        copy.access !== initialAccess ||
        JSON.stringify(copy.json) !== JSON.stringify(editor.getJSON())
      if (differs) {
        recoveryPendingRef.current = true
        setRecovery(copy)
      } else {
        clearUnsavedCopy(postId)
      }
    },
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

  const router = useRouter()
  // Tiptap has no built-in dirty flag, so compare against a snapshot taken once
  // the editor has loaded its initial document.
  const snapshotRef = useRef<{ title: string; description: string; access: number; json: string } | null>(null)
  const latestRef = useRef({ title, description, access })

  useEffect(() => {
    latestRef.current = { title, description, access }
  }, [title, description, access])

  useEffect(() => {
    if (!editor || !editable || snapshotRef.current) return
    snapshotRef.current = {
      title: initialTitle,
      description: initialDescription,
      access: initialAccess,
      json: JSON.stringify(editor.getJSON()),
    }
  }, [editor, editable, initialTitle, initialDescription, initialAccess])

  // Stable identity so the guard's listeners don't re-attach on every keystroke;
  // it reads the latest values through refs when actually called.
  const isDirty = useCallback(() => {
    const snapshot = snapshotRef.current
    if (!editor || !snapshot) return false
    const { title, description, access } = latestRef.current
    return (
      title !== snapshot.title ||
      description !== snapshot.description ||
      access !== snapshot.access ||
      JSON.stringify(editor.getJSON()) !== snapshot.json
    )
  }, [editor])

  const { pending, requestNavigation, discardAndLeave, keepEditing } = useUnsavedChangesGuard({
    isDirty,
    onNavigate: (href) => router.push(href),
  })

  // Writes at most once a second while there are unsaved changes, and removes
  // the copy once the editor is back in step with what's stored.
  const persistUnsavedCopy = useThrottledCallback(
    () => {
      if (!editor || !editable || !snapshotRef.current) return
      if (recoveryPendingRef.current) return
      if (!isDirty()) {
        clearUnsavedCopy(savedPostId)
        return
      }
      const { title, description, access } = latestRef.current
      writeUnsavedCopy(savedPostId, {
        json: editor.getJSON(),
        title,
        description,
        access,
        savedAt: Date.now(),
      })
    },
    1000,
    [editor, editable, isDirty, savedPostId],
    { leading: false, trailing: true }
  )

  useEffect(() => {
    if (!editor || !editable) return
    const onUpdate = () => persistUnsavedCopy()
    editor.on("update", onUpdate)
    return () => {
      editor.off("update", onUpdate)
    }
  }, [editor, editable, persistUnsavedCopy])

  useEffect(() => {
    persistUnsavedCopy()
  }, [title, description, access, persistUnsavedCopy])

  const restoreRecovery = () => {
    if (!editor || !recovery) return
    recoveryPendingRef.current = false
    editor.commands.setContent(recovery.json)
    setTitle(recovery.title)
    setDescription(recovery.description)
    setAccess(recovery.access)
    setRecovery(null)
  }

  const discardRecovery = () => {
    recoveryPendingRef.current = false
    persistUnsavedCopy.cancel()
    clearUnsavedCopy(savedPostId)
    setRecovery(null)
  }

  const savePost = (
    accessValue: number,
    { redirectTo, stay = false }: { redirectTo?: string; stay?: boolean } = {}
  ) => {
    if (!editor || isPending) return // bail out early

    // Check here first so the common mistake gets an instant answer; the
    // server runs the same schema again, since the client can't be trusted.
    const meta = postMetaSchema.safeParse({ title, description, access: accessValue })
    if (!meta.success) {
      setSaveError(meta.error.issues[0]?.message ?? "Check the post's details.")
      return
    }
    setSaveError(null)

    // Serialize to a string here: passing the raw getJSON() object through the
    // server action drops every node's `attrs` (null-prototype objects that
    // React's serializer won't encode), losing textAlign and heading levels.
    const json = JSON.stringify(editor.getJSON())
    // The guard deliberately isn't disarmed here: a successful save redirects
    // programmatically, which neither the click interceptor nor `beforeunload`
    // reacts to. Clearing the snapshot up front would instead leave a *failed*
    // save silently unguarded, letting the next click drop the user's work.
    // Saving as a draft removes this post's view page, so a redirect back to it
    // (e.g. Cancel on a private post, whose exit target *is* that page) would
    // land on a 404. Drop it and let the action fall back to the drafts list.
    const target =
      accessValue === ACCESS_DRAFT && redirectTo === `/posts/${savedPostId}` ? undefined : redirectTo
    const input = { json, title, description, access: accessValue, redirectTo: target, stay }
    // Dispatch through a transition so Next applies the action's
    // revalidatePath() to the client router cache before redirecting;
    // otherwise the posts list can navigate to a stale cached entry.
    startTransition(async () => {
      let result: SaveResult | undefined
      try {
        result =
          savedPostId != null
            ? await editPostHandler({ id: savedPostId, ...input })
            : await createPostHandler(input)
      } catch (error) {
        // redirect() throws internally on success; only surface real failures
        if (error instanceof Error && error.message === "NEXT_REDIRECT") {
          persistUnsavedCopy.cancel()
          clearUnsavedCopy(savedPostId)
          return
        }
        console.error("Failed to save post:", error)
        setSaveError("Couldn't save. Check your connection and try again; your writing is still here.")
        return
      }

      if (result && "error" in result) {
        setSaveError(result.error)
        return
      }

      // Cancel first, so a pending throttled write can't put a copy of
      // already-saved work back into storage right after it's cleared.
      persistUnsavedCopy.cancel()
      clearUnsavedCopy(savedPostId)
      if (!result) return // redirected

      // Saved in place. A new post now has an id, so record it in the URL,
      // letting a reload reopen this post instead of a blank editor. It stays
      // on /posts/create rather than moving to /posts/[id]/edit: the save's
      // revalidatePath refreshes whatever route the URL names, and a different
      // route means a different page, which remounts the editor and throws
      // away the cursor position and undo history. The same route with a
      // search param re-renders in place.
      if (savedPostId == null) {
        setSavedPostId(result.id)
        window.history.replaceState(null, "", `/posts/create?id=${result.id}`)
      }
      setSavedAccess(accessValue)
      // What was just stored is the new baseline for "unsaved changes".
      snapshotRef.current = { title, description, access: accessValue, json }
      setSavedAt(new Date())
    })
  }

  useHotkeys("mod+s", () => savePost(access, { stay: true }), {
    enabled: editable,
    enableOnFormTags: true,
    enableOnContentEditable: true,
    preventDefault: true,
    // Match the letter typed, not the physical key: on a Dvorak or AZERTY
    // layout "S" is elsewhere, and Save should follow the letter, as it does
    // in the browser and every other editor.
    useKey: true,
  })

  const handleSave = () => savePost(access)

  // Where backing out lands. Keyed off the *saved* access level rather than the
  // dropdown's current value: an unsaved switch to Public shouldn't send Cancel
  // to a view page that doesn't exist yet.
  const cancelHref =
    savedAccess === ACCESS_DRAFT ? "/drafts" // drafts have no view page
    : savedPostId != null ? `/posts/${savedPostId}`
    : "/posts"

  const handleCancel = () => requestNavigation(cancelHref)

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
    // The editable editor *is* the whole page on /posts/create and
    // /posts/[id]/edit, so it carries the main landmark and the skip-link
    // target. The read-only branch above deliberately does not — there it
    // renders inside the post page's own <main>, and a second one would be
    // both a duplicate id and a nested landmark.
    <main id="main-content" className="simple-editor-wrapper">
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
              editor={editor}
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              onSave={handleSave}
              onCancel={handleCancel}
              isMobile={isMobile}
              savedAt={savedAt}
            />
          ) : (
            <MobileToolbarContent
              type={currentView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        {recovery && (
          <div className="mx-auto w-full max-w-[648px] px-12 pt-4">
            <div
              role="status"
              className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50"
            >
              <span className="flex-1">
                You have unsaved changes from{" "}
                {new Date(recovery.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.
              </span>
              <Button variant="primary" onClick={restoreRecovery}>
                Restore
              </Button>
              <Button variant="ghost" onClick={discardRecovery}>
                Discard
              </Button>
            </div>
          </div>
        )}

        {saveError && (
          <div className="mx-auto w-full max-w-[648px] px-12 pt-4">
            <p
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
            >
              {saveError}
            </p>
          </div>
        )}

        <div className="mx-auto flex w-full max-w-[648px] flex-col gap-3 px-12 pt-4 sm:flex-row sm:items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setSaveError(null)
            }}
            placeholder="Post title"
            aria-label="Post title"
            className="w-full flex-1 rounded-md border border-zinc-300 bg-white p-2 text-lg font-medium text-foreground placeholder:text-(--faint-foreground) focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:focus:border-blue-500"
          />
          <select
            value={access}
            onChange={(e) => setAccess(Number(e.target.value))}
            aria-label="Access level"
            className="rounded-md border border-zinc-300 bg-white p-2 text-foreground focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:focus:border-blue-500"
          >
            <option value={ACCESS_DRAFT}>Draft</option>
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
            className="w-full resize-none rounded-md border border-zinc-300 bg-white p-2 text-sm text-foreground placeholder:text-(--faint-foreground) focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:focus:border-blue-500"
          />
        </div>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />

        <UnsavedChangesDialog
          open={pending !== null}
          isSaving={isPending}
          onSaveAsDraft={() => savePost(ACCESS_DRAFT, { redirectTo: pending?.href })}
          onDiscard={discardAndLeave}
          onKeepEditing={keepEditing}
        />
      </EditorContext.Provider>
    </main>
  )
}
