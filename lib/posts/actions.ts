'use server';
import "server-only";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPostFormSchema,
  type CreatePostFormFields,
} from "@/schemas/post-form";
import type { EditPostInput, NewPostInput, PostRow } from "@/type/post";

// Data-layer mutation functions
export async function createPost(postData: NewPostInput) {
  const { post_name, post_author, post_body, post_date } = postData;
  await sql`
    INSERT INTO "POSTS" (post_name, post_author, post_body, post_date)
    VALUES (${post_name}, ${post_author}, ${post_body}, ${post_date})
  `;
  return "Post created successfully";
}

export async function editPost(postData: EditPostInput) {
  const { id, post_name, post_body, post_edit_date } = postData;
  await sql`
    UPDATE "POSTS"
    SET post_name = ${post_name}, post_body = ${post_body}, post_edit_date = ${post_edit_date}
    WHERE id = ${id}
  `;
  return "Post edited successfully";
}

export async function deletePostById(id: number): Promise<PostRow | null> {
  const result = (await sql`
    DELETE FROM "POSTS"
    WHERE id = ${id}
    RETURNING *;
  `) as PostRow[];
  return result[0] ?? null;
}

// Server action handlers that orchestrate mutations
export async function createPostHandler(input: CreatePostFormFields) {
  const { title: post_name, body: post_body } =
    createPostFormSchema.parse(input);

  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const post_date = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  const postData: NewPostInput = {
    post_name,
    post_author: 1,
    post_body,
    post_date,
  };

  await createPost(postData);
  redirect("/posts");
}

export async function editPostHandler(data: FormData) {
  const post_name = data.get("title") as string;
  const post_body = data.get("body") as string;

  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const post_edit_date = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  const postData: EditPostInput = {
    id: Number(data.get("id")),
    post_name,
    post_body,
    post_edit_date,
  };

  await editPost(postData);
  redirect(`/posts/${postData.id}`);
}

export async function deletePostAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) throw new Error("Invalid id");

  await deletePostById(id);
  revalidatePath("/posts");
}