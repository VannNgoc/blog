"use client";
import { editPostHandler } from "@/lib/posts/actions";
import type { CreatePostFormFields } from "@/schemas/post-form";
import PostForm from "./PostForm";

type EditPostFormProps = {
  post: {
    id: number;
    post_name: string;
    post_body: string;
    access: number;
  };
};

export default function EditPostForm({ post }: EditPostFormProps) {
  async function onSubmit(data: CreatePostFormFields) {
    await editPostHandler({ ...data, id: post.id });
  }

  return (
    <PostForm
      heading="Edit Post"
      defaultValues={{ title: post.post_name, body: post.post_body, access: post.access }}
      onSubmit={onSubmit}
      cancelHref={`/posts/${post.id}`}
    />
  );
}
