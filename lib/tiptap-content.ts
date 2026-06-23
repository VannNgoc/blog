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
