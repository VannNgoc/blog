import { z } from "zod";

export const createPostFormSchema = z.object({
  title: z.string().min(1, "Please enter a title."),
  body: z.string().min(1, "Please enter a thought."),
});

export type CreatePostFormFields = z.infer<typeof createPostFormSchema>;
