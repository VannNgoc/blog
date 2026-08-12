import { render, screen, fireEvent, act } from "@testing-library/react"
import type { Editor } from "@tiptap/react"
import { ImageAltButton } from "@/components/tiptap-ui/image-alt-button"

type MockEditorOptions = {
  isEditable?: boolean
  isImageActive?: boolean
  imageAlt?: string
}

function createMockEditor(options: MockEditorOptions = {}) {
  const state = {
    isEditable: options.isEditable ?? true,
    isImageActive: options.isImageActive ?? false,
    imageAlt: options.imageAlt ?? "",
  }
  const listeners = new Map<string, Set<() => void>>()
  const updateAttributesCalls: Array<{ type: string; attrs: Record<string, unknown> }> = []

  const chain = {
    focus: () => chain,
    updateAttributes: (type: string, attrs: Record<string, unknown>) => {
      updateAttributesCalls.push({ type, attrs })
      if (type === "image" && typeof attrs.alt === "string") state.imageAlt = attrs.alt
      return chain
    },
    run: () => true,
  }

  const editor = {
    get isEditable() {
      return state.isEditable
    },
    isActive: (type: string) => (type === "image" ? state.isImageActive : false),
    getAttributes: (type: string) => (type === "image" ? { alt: state.imageAlt } : {}),
    on: (event: string, handler: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    },
    off: (event: string, handler: () => void) => {
      listeners.get(event)?.delete(handler)
    },
    chain: () => chain,
  }

  return {
    editor: editor as unknown as Editor,
    state,
    updateAttributesCalls,
    /** Simulates the editor notifying listeners after a real selection/content change. */
    emit: (event: "selectionUpdate" | "transaction") => {
      listeners.get(event)?.forEach((handler) => handler())
    },
  }
}

describe("ImageAltButton", () => {
  it("renders nothing when the editor is not editable", () => {
    const { editor } = createMockEditor({ isEditable: false })
    render(<ImageAltButton editor={editor} />)

    expect(screen.queryByRole("button", { name: "Edit image alt text" })).not.toBeInTheDocument()
  })

  it("renders nothing when there is no editor yet", () => {
    render(<ImageAltButton editor={null} />)

    expect(screen.queryByRole("button", { name: "Edit image alt text" })).not.toBeInTheDocument()
  })

  it("disables the trigger when no image is selected", () => {
    const { editor } = createMockEditor({ isImageActive: false })
    render(<ImageAltButton editor={editor} />)

    expect(screen.getByRole("button", { name: "Edit image alt text" })).toBeDisabled()
  })

  it("enables the trigger once an image is selected", () => {
    const mock = createMockEditor({ isImageActive: false })
    render(<ImageAltButton editor={mock.editor} />)

    mock.state.isImageActive = true
    act(() => {
      mock.emit("selectionUpdate")
    })

    expect(screen.getByRole("button", { name: "Edit image alt text" })).toBeEnabled()
  })

  it("pre-fills the popover with the selected image's current alt text", () => {
    const mock = createMockEditor({ isImageActive: true, imageAlt: "vann-iphone-2" })
    render(<ImageAltButton editor={mock.editor} />)

    fireEvent.click(screen.getByRole("button", { name: "Edit image alt text" }))

    expect(screen.getByPlaceholderText("Describe this image...")).toHaveValue("vann-iphone-2")
  })

  it("saves the edited alt text via editor.updateAttributes and closes the popover", () => {
    const mock = createMockEditor({ isImageActive: true, imageAlt: "vann-iphone-2" })
    render(<ImageAltButton editor={mock.editor} />)

    fireEvent.click(screen.getByRole("button", { name: "Edit image alt text" }))
    const input = screen.getByPlaceholderText("Describe this image...")
    fireEvent.change(input, { target: { value: "Drummer at a Sunday service" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(mock.updateAttributesCalls).toContainEqual({
      type: "image",
      attrs: { alt: "Drummer at a Sunday service" },
    })
    expect(screen.queryByPlaceholderText("Describe this image...")).not.toBeInTheDocument()
  })

  it("saves on Enter without requiring a click on Save", () => {
    const mock = createMockEditor({ isImageActive: true, imageAlt: "" })
    render(<ImageAltButton editor={mock.editor} />)

    fireEvent.click(screen.getByRole("button", { name: "Edit image alt text" }))
    const input = screen.getByPlaceholderText("Describe this image...")
    fireEvent.change(input, { target: { value: "A candid portrait" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(mock.updateAttributesCalls).toContainEqual({
      type: "image",
      attrs: { alt: "A candid portrait" },
    })
  })

  it("does not save on keys other than Enter", () => {
    const mock = createMockEditor({ isImageActive: true, imageAlt: "" })
    render(<ImageAltButton editor={mock.editor} />)

    fireEvent.click(screen.getByRole("button", { name: "Edit image alt text" }))
    const input = screen.getByPlaceholderText("Describe this image...")
    fireEvent.change(input, { target: { value: "still typing" } })
    fireEvent.keyDown(input, { key: "a" })

    expect(mock.updateAttributesCalls).toHaveLength(0)
  })
})
