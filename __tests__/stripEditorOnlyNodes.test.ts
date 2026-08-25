import { stripEditorOnlyNodes } from "@/lib/tiptap-content";
import type { JSONContent } from "@tiptap/core";

/** The shape post 191 was saved with: an upload placeholder the author
    inserted and then never picked a file for. The read-only renderer has no
    extension for `imageUpload`, so rendering it threw and the reader got an
    error page instead of the post. */
function docWithAbandonedUpload(): JSONContent {
  return {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Deep Creek Lake" }] },
      { type: "imageUpload", attrs: { accept: "image/*" } },
      { type: "paragraph", content: [{ type: "text", text: "after" }] },
    ],
  };
}

describe("stripEditorOnlyNodes", () => {
  it("drops an abandoned imageUpload placeholder", () => {
    const out = stripEditorOnlyNodes(docWithAbandonedUpload());

    expect(out.content).toHaveLength(2);
    expect(out.content?.some((n) => n.type === "imageUpload")).toBe(false);
  });

  it("keeps the surrounding content and its order intact", () => {
    const out = stripEditorOnlyNodes(docWithAbandonedUpload());

    expect(out.content?.[0].content?.[0].text).toBe("Deep Creek Lake");
    expect(out.content?.[1].content?.[0].text).toBe("after");
  });

  it("strips placeholders nested inside other blocks, not just at the top level", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            { type: "imageUpload", attrs: {} },
            { type: "paragraph", content: [{ type: "text", text: "quoted" }] },
          ],
        },
      ],
    };

    const out = stripEditorOnlyNodes(doc);

    expect(out.content?.[0].content).toHaveLength(1);
    expect(out.content?.[0].content?.[0].type).toBe("paragraph");
  });

  it("leaves a real image node alone — only the placeholder is editor-only", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "image", attrs: { src: "/api/file?pathname=posts%2Fa.jpg" } }],
    };

    expect(stripEditorOnlyNodes(doc).content).toHaveLength(1);
  });

  it("passes through a document with nothing to strip", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
    };

    expect(stripEditorOnlyNodes(doc)).toEqual(doc);
  });

  it("handles an empty document without throwing", () => {
    expect(() => stripEditorOnlyNodes({ type: "doc" })).not.toThrow();
    expect(() => stripEditorOnlyNodes({ type: "doc", content: [] })).not.toThrow();
  });
});
