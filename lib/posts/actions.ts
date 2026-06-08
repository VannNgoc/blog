'use server';
import "server-only";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPostFormSchema,
  editPostFormSchema,
  type CreatePostFormFields,
  type EditPostFormFields,
} from "@/schemas/post-form";
import type { EditPostInput, NewPostInput, PostRow } from "@/type/post";
import { auth } from '@/lib/auth/server';
import { getPostById } from '@/lib/posts/queries';
// Data-layer mutation functions
export async function createPost(postData: NewPostInput) {
  const { post_name, post_author, post_body, post_date, access_type } = postData;
  await sql`
    INSERT INTO "POSTS" (post_name, post_author, post_body, post_date, access)
    VALUES (${post_name}, ${post_author}, ${post_body}, ${post_date}, ${access_type})
  `;
  return "Post created successfully";
}

export async function editPost(postData: EditPostInput) {
  const { id, post_name, post_body, post_edit_date, access_type } = postData;
  await sql`
    UPDATE "POSTS"
    SET post_name = ${post_name}, post_body = ${post_body}, post_edit_date = ${post_edit_date}, access = ${access_type}
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
  const { title: post_name, body: post_body, access: access_type } =
    createPostFormSchema.parse(input);

  const { data : session } = await auth.getSession();
  if(session?.user) {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const post_date = `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`;
  
    const postData: NewPostInput = {
      post_name,
      post_author: session?.user.id,
      post_body,
      post_date,
      access_type
    };
    await createPost(postData);
    revalidatePath("/posts");
    redirect("/posts");
  }else{
    return "Error user is null"
  }
}

export async function editPostHandler(input: EditPostFormFields) {
  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const { id, title: post_name, body: post_body, access: access_type } =
    editPostFormSchema.parse(input);

  const post = await getPostById(id);
  if (!post) throw new Error("Post not found");
  if (post.post_author !== session.user.id) throw new Error("Not authorised");

  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const post_edit_date = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  const postData: EditPostInput = {
    id,
    post_name,
    post_body,
    post_edit_date,
    access_type,
  };

  await editPost(postData);
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  redirect(`/posts/${id}`);
}

export async function deletePostAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) throw new Error("Invalid id");

  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const post = await getPostById(id);
  if (!post) throw new Error("Post not found");
  if (post.post_author !== session.user.id) throw new Error("Not authorised");

  await deletePostById(id);
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
}