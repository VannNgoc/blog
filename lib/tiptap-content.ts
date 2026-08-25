import type { JSONContent } from "@tiptap/core";

/**
 * Flattens a Tiptap JSON document into plain text. Used for list excerpts and
 * any place that needs a non-rendered preview of editor content. Block-level
 * nodes are separated by spaces so words from adjacent paragraphs don't merge.
 */
export function tiptapToPlainText(node?: JSONContent): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (!node.content?.length) return "";

  return node.content.map(tiptapToPlainText).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Returns the plain text of only the first top-level block (e.g. the opening
 * paragraph or heading) of a Tiptap document — a tighter preview than
 * flattening the whole body. Used as the list excerpt fallback when a post has
 * no authored description.
 */
export function tiptapFirstBlockText(doc?: JSONContent): string {
  return tiptapToPlainText(doc?.content?.[0]);
}

/**
 * Node types the editor creates as transient UI, which are never meaningful
 * content and have no read-only counterpart.
 *
 * `imageUpload` is the drop-zone placeholder the toolbar inserts. It's meant to
 * be replaced by a real `image` node once a file finishes uploading — but if an
 * author inserts one and saves without picking a file, it persists into
 * `post_body_json`. The read-only renderer registers no extension for it (see
 * `postSchemaExtensions`), so it threw on render, and the reader got an error
 * page instead of the post. Post 191 is exactly that case.
 */
const EDITOR_ONLY_NODE_TYPES = new Set(["imageUpload"]);

/**
 * Drops editor-only placeholder nodes from a stored document.
 *
 * Applied on save so new posts never carry them, and again on read so posts
 * saved before that guard existed still render. The editor itself must NOT use
 * this — `imageUpload` is a legitimate node while composing.
 */
export function stripEditorOnlyNodes(doc: JSONContent): JSONContent {
  if (!doc.content?.length) return doc;

  const content = doc.content
    .filter((child) => !(child.type && EDITOR_ONLY_NODE_TYPES.has(child.type)))
    .map(stripEditorOnlyNodes);

  return { ...doc, content };
}
