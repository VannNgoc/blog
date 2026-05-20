import { z } from "zod";

export const createPostFormSchema = z.object({
  title: z.string().min(1, "Please enter a title."),
  body: z.string().min(1, "Please enter a thought."),
  access: z.number(),
});

export type CreatePostFormFields = z.infer<typeof createPostFormSchema>;

export const editPostFormSchema = createPostFormSchema.extend({
  id: z.number(),
});

export type EditPostFormFields = z.infer<typeof editPostFormSchema>;
