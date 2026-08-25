import { render } from "@testing-library/react"
import { PostContent } from "@/components/tiptap-templates/simple/post-content"
import type { JSONContent } from "@tiptap/core"

// PostImageLoader only wires load/error listeners in an effect; it doesn't
// change the markup PostContent hands it, so these tests can inspect the
// server-rendered DOM shape directly without waiting on that effect.

function docWithImages(): JSONContent {
  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Some read-only text with a link", marks: [] }],
      },
      {
        type: "image",
        attrs: {
          src: "/api/file?pathname=posts%2Fa.jpg&postId=1",
          alt: "first photo",
          loading: "eager",
          imgWidth: 800,
          imgHeight: 600,
        },
      },
      {
        type: "image",
        attrs: {
          src: "/api/file?pathname=posts%2Fb.jpg&postId=1",
          alt: "second photo",
          loading: "lazy",
          imgWidth: 400,
          imgHeight: 300,
        },
      },
    ],
  }
}

describe("PostContent", () => {
  it("renders post text and the read-only editor container classes", () => {
    const { container } = render(<PostContent content={docWithImages()} />)

    expect(container.querySelector(".simple-editor-wrapper--readonly")).toBeInTheDocument()
    expect(container.querySelector(".simple-editor-content")).toBeInTheDocument()
    expect(container.querySelector(".tiptap.ProseMirror.simple-editor")).toBeInTheDocument()
    expect(container.textContent).toContain("Title")
    expect(container.textContent).toContain("Some read-only text with a link")
  })

  it("marks the first image eager + high priority, discoverable without any client JS", () => {
    const { container } = render(<PostContent content={docWithImages()} />)
    const images = container.querySelectorAll("img")

    expect(images).toHaveLength(2)

    const [first, second] = Array.from(images)
    expect(first.getAttribute("loading")).toBe("eager")
    expect(first.getAttribute("fetchpriority")).toBe("high")
    expect(first.getAttribute("src")).toBe("/api/file?pathname=posts%2Fa.jpg&postId=1")

    expect(second.getAttribute("loading")).toBe("lazy")
    expect(second.hasAttribute("fetchpriority")).toBe(false)
  })

  it("renders a skeleton placeholder alongside each image before hydration runs", () => {
    const { container } = render(<PostContent content={docWithImages()} />)
    const wrappers = container.querySelectorAll(".tiptap-image-node")

    expect(wrappers).toHaveLength(2)
    wrappers.forEach((wrapper) => {
      expect(wrapper.getAttribute("data-loaded")).toBe("false")
      expect(wrapper.querySelector(".tiptap-image-node-skeleton")).toBeInTheDocument()
    })

    const eagerWrapper = wrappers[0]
    expect(eagerWrapper.getAttribute("style")).toContain("aspect-ratio: 800 / 600")
  })

  /** The regression guard for post-page LCP. `tiptap-image-node-hidden` is
      `opacity: 0`, and only a client-side effect ever removed it — so emitting
      it here made every image wait for the bundle to download and hydrate
      before it could paint, and an element at `opacity: 0` cannot be a Largest
      Contentful Paint candidate at all. The skeleton shares the image's grid
      cell, so the placeholder still shows until the image decodes. */
  it("never hides reader-facing images behind a class only JavaScript can remove", () => {
    const { container } = render(<PostContent content={docWithImages()} />)

    container.querySelectorAll<HTMLImageElement>(".tiptap-image-node img").forEach((img) => {
      expect(img).not.toHaveClass("tiptap-image-node-hidden")
    })
  })

  it("decodes below-the-fold images off the main thread, but leaves the LCP image alone", () => {
    const { container } = render(<PostContent content={docWithImages()} />)
    const imgs = container.querySelectorAll<HTMLImageElement>(".tiptap-image-node img")

    // The eager image is the LCP candidate; forcing async decode on it can
    // delay the very paint it is preloaded to win.
    expect(imgs[0].getAttribute("decoding")).toBeNull()
    expect(imgs[1].getAttribute("decoding")).toBe("async")
  })
})
