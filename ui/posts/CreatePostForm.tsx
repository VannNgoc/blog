"use client";
import { createPostHandler } from "@/lib/posts/actions";
import PostForm from "./PostForm";

export default function CreatePostForm() {
  return (
    <PostForm
      heading="Create a New Post"
      defaultValues={{ title: "", body: "", access: 1 }}
      onSubmit={createPostHandler}
    />
  );
}
