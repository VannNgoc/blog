import { z } from "zod";

/**
 * Posts keep their body as Tiptap editor JSON rather than a string, so only the
 * title, description, and access level are validated through zod here. The body
 * is validated by the editor itself.
 */
export const postMetaSchema = z.object({
  title: z.string().min(1, "Please enter a title."),
  description: z.string().max(300, "Description is too long.").optional().default(""),
  access: z.number(),
});

export type PostMetaFields = z.infer<typeof postMetaSchema>;
