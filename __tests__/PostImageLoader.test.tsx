import { render, fireEvent } from "@testing-library/react"
import { PostImageLoader } from "@/components/tiptap-node/image-node/post-image-loader"

function imageMarkup(src: string) {
  return (
    <div className="tiptap-image-node" data-loaded="false">
      <div className="skeleton tiptap-image-node-skeleton" aria-hidden="true" />
      <img src={src} alt="" className="tiptap-image-node-hidden" />
    </div>
  )
}

describe("PostImageLoader", () => {
  it("reveals the image and drops the skeleton once it loads", () => {
    const { container } = render(
      <PostImageLoader className="tiptap ProseMirror simple-editor">
        {imageMarkup("/a.jpg")}
      </PostImageLoader>
    )

    const wrapper = container.querySelector(".tiptap-image-node") as HTMLElement
    const img = wrapper.querySelector("img") as HTMLImageElement

    expect(wrapper.querySelector(".tiptap-image-node-skeleton")).toBeInTheDocument()
    expect(img).toHaveClass("tiptap-image-node-hidden")

    fireEvent.load(img)

    expect(wrapper.getAttribute("data-loaded")).toBe("true")
    expect(wrapper.querySelector(".tiptap-image-node-skeleton")).not.toBeInTheDocument()
    expect(img).not.toHaveClass("tiptap-image-node-hidden")
  })

  it("also reveals the image on a load error instead of leaving the skeleton stuck", () => {
    const { container } = render(
      <PostImageLoader className="tiptap ProseMirror simple-editor">
        {imageMarkup("/broken.jpg")}
      </PostImageLoader>
    )

    const wrapper = container.querySelector(".tiptap-image-node") as HTMLElement
    const img = wrapper.querySelector("img") as HTMLImageElement

    fireEvent.error(img)

    expect(wrapper.getAttribute("data-loaded")).toBe("true")
    expect(wrapper.querySelector(".tiptap-image-node-skeleton")).not.toBeInTheDocument()
  })

  it("reveals immediately for an image that's already complete (cached) on mount", () => {
    // jsdom never actually loads image resources, so `complete` stays false
    // for a real src by default. A cache hit in a real browser reports
    // `complete: true` synchronously on mount instead of firing `load`
    // later, so simulate that by stubbing the property jsdom doesn't model.
    const complete = jest
      .spyOn(HTMLImageElement.prototype, "complete", "get")
      .mockReturnValue(true)

    try {
      const { container } = render(
        <PostImageLoader className="tiptap ProseMirror simple-editor">
          {imageMarkup("/cached.jpg")}
        </PostImageLoader>
      )

      const wrapper = container.querySelector(".tiptap-image-node") as HTMLElement
      expect(wrapper.getAttribute("data-loaded")).toBe("true")
      expect(wrapper.querySelector(".tiptap-image-node-skeleton")).not.toBeInTheDocument()
    } finally {
      complete.mockRestore()
    }
  })
})
