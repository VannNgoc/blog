'use server';
import "server-only";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { postMetaSchema } from "@/schemas/post-form";
import type { EditPostInput, NewPostInput, PostRow } from "@/type/post";
import { auth } from '@/lib/auth/server';
import { getPostById } from '@/lib/posts/queries';
import type { JSONContent } from "@tiptap/core";

/** Build today's date as YYYY-MM-DD for post_date / post_edit_date columns. */
function today() {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

// Data-layer mutation functions
export async function createPost(postData: NewPostInput) {
  const { post_name, post_author, post_body, post_description, post_date, access_type } = postData;
  await sql`
    INSERT INTO "POSTS" (post_name, post_author, post_body_json, post_description, post_date, access)
    VALUES (${post_name}, ${post_author}, ${post_body}, ${post_description}, ${post_date}, ${access_type})
  `;
  return "Post created successfully";
}

export async function editPost(postData: EditPostInput) {
  const { id, post_name, post_body, post_description, post_edit_date, access_type } = postData;
  await sql`
    UPDATE "POSTS"
    SET post_name = ${post_name}, post_body_json = ${post_body}, post_description = ${post_description}, post_edit_date = ${post_edit_date}, access = ${access_type}
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
export async function createPostHandler(input: {
  json: JSONContent;
  title: string;
  description: string;
  access: number;
}) {
  const { title: post_name, description: post_description, access: access_type } =
    postMetaSchema.parse({
      title: input.title,
      description: input.description,
      access: input.access,
    });

  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const postData: NewPostInput = {
    post_name,
    post_author: session.user.id,
    post_body: input.json,
    post_description,
    post_date: today(),
    access_type,
  };
  await createPost(postData);
  revalidatePath("/posts");
  redirect("/posts");
}

export async function editPostHandler(input: {
  id: number;
  json: JSONContent;
  title: string;
  description: string;
  access: number;
}) {
  const { title: post_name, description: post_description, access: access_type } =
    postMetaSchema.parse({
      title: input.title,
      description: input.description,
      access: input.access,
    });

  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const post = await getPostById(input.id);
  if (!post) throw new Error("Post not found");
  if (post.post_author !== session.user.id) throw new Error("Not authorised");

  const postData: EditPostInput = {
    id: input.id,
    post_name,
    post_body: input.json,
    post_description,
    post_edit_date: today(),
    access_type,
  };

  await editPost(postData);
  revalidatePath("/posts");
  revalidatePath(`/posts/${input.id}`);
  redirect(`/posts/${input.id}`);
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
