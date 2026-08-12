import { render, fireEvent } from "@testing-library/react"
import type { NodeViewProps } from "@tiptap/react"
import { ImageNode } from "@/components/tiptap-node/image-node/image-node"

function mockNodeViewProps(attrs: Record<string, unknown>): NodeViewProps {
  return { node: { attrs } } as unknown as NodeViewProps
}

describe("ImageNode", () => {
  it("shows a skeleton and a hidden image before it loads", () => {
    const { container } = render(
      <ImageNode {...mockNodeViewProps({ src: "/a.jpg", alt: "A photo" })} />
    )

    const wrapper = container.querySelector(".tiptap-image-node") as HTMLElement
    const img = wrapper.querySelector("img") as HTMLImageElement

    expect(wrapper.querySelector(".tiptap-image-node-skeleton")).toBeInTheDocument()
    expect(img).toHaveClass("tiptap-image-node-hidden")
    expect(img).toHaveAttribute("src", "/a.jpg")
  })

  it("reveals the image and drops the skeleton on load", () => {
    const { container } = render(
      <ImageNode {...mockNodeViewProps({ src: "/a.jpg", alt: "A photo" })} />
    )

    const img = container.querySelector("img") as HTMLImageElement
    fireEvent.load(img)

    const wrapper = container.querySelector(".tiptap-image-node") as HTMLElement
    expect(wrapper.querySelector(".tiptap-image-node-skeleton")).not.toBeInTheDocument()
    expect(img).not.toHaveClass("tiptap-image-node-hidden")
  })

  it("renders a fallback message instead of a broken image on error", () => {
    const { container } = render(
      <ImageNode {...mockNodeViewProps({ src: "/broken.jpg", alt: "A photo" })} />
    )

    const img = container.querySelector("img") as HTMLImageElement
    fireEvent.error(img)

    expect(container.querySelector("img")).not.toBeInTheDocument()
    expect(container.querySelector(".tiptap-image-node-skeleton")).not.toBeInTheDocument()
    expect(container.querySelector(".tiptap-image-node-error")).toBeInTheDocument()
  })

  it("includes the image's alt text in the fallback message", () => {
    const { container, getByText } = render(
      <ImageNode {...mockNodeViewProps({ src: "/broken.jpg", alt: "Sunset over the bay" })} />
    )

    fireEvent.error(container.querySelector("img") as HTMLImageElement)

    expect(getByText("Image failed to load: Sunset over the bay")).toBeInTheDocument()
    expect(
      container.querySelector(".tiptap-image-node-error")
    ).toHaveAttribute("aria-label", "Sunset over the bay")
  })

  it("falls back to a generic message when there is no alt text", () => {
    const { container, getByText } = render(
      <ImageNode {...mockNodeViewProps({ src: "/broken.jpg", alt: "" })} />
    )

    fireEvent.error(container.querySelector("img") as HTMLImageElement)

    expect(getByText("Image failed to load")).toBeInTheDocument()
    expect(
      container.querySelector(".tiptap-image-node-error")
    ).toHaveAttribute("aria-label", "Image failed to load")
  })

  it("reserves the aspect ratio from captured dimensions while loading", () => {
    const { container } = render(
      <ImageNode
        {...mockNodeViewProps({ src: "/a.jpg", alt: "A photo", imgWidth: 800, imgHeight: 400 })}
      />
    )

    const wrapper = container.querySelector(".tiptap-image-node") as HTMLElement
    expect(wrapper.style.aspectRatio).toBe("800 / 400")
  })
})
