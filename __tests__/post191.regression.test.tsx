import { render } from "@testing-library/react";
import { renderToReactElement } from "@tiptap/static-renderer";
import type { JSONContent } from "@tiptap/core";

import { PostContent } from "@/components/tiptap-templates/simple/post-content";
import { postSchemaExtensions } from "@/components/tiptap-templates/simple/post-schema-extensions";
import { StaticImageNode } from "@/components/tiptap-node/image-node/image-node-static-extension";

import post191 from "./__fixtures__/post-191.json";

/**
 * The real stored body of post 191 — a private post whose author inserted an
 * image-upload placeholder and saved without choosing a file. Kept as a
 * fixture rather than a hand-written doc so this pins the actual failure that
 * reached production, not an approximation of it.
 */
const doc = post191 as JSONContent;

describe("post 191 (abandoned imageUpload placeholder)", () => {
  it("still contains the placeholder that broke it, so this test stays meaningful", () => {
    expect(doc.content?.some((n) => n.type === "imageUpload")).toBe(true);
  });

  it("demonstrates the raw renderer is what fails on it", () => {
    expect(() =>
      renderToReactElement({
        content: doc,
        extensions: [...postSchemaExtensions, StaticImageNode],
      }),
    ).toThrow();
  });

  it("renders through PostContent without throwing", () => {
    expect(() => render(<PostContent content={doc} />)).not.toThrow();
  });

  it("shows the post's actual prose", () => {
    const { container } = render(<PostContent content={doc} />);

    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });
});
