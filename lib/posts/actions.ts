'use server';
import "server-only";
import { del } from "@vercel/blob";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { postMetaSchema } from "@/schemas/post-form";
import type { EditPostInput, NewPostInput, PostRow } from "@/type/post";
import { auth } from '@/lib/auth/server';
import { ACCESS_DRAFT } from '@/lib/constants';
import { getPostById } from '@/lib/posts/queries';
import { extractImagePathnames } from '@/lib/tiptap-utils';
import type { JSONContent } from "@tiptap/core";
import { stripEditorOnlyNodes } from "@/lib/tiptap-content";

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

/** Accept only same-site absolute paths, so a caller can't turn a save into an open redirect. */
function safeRedirect(target: string | undefined, fallback: string) {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}

// Server action handlers that orchestrate mutations
export async function createPostHandler(input: {
  // Tiptap document, serialized with JSON.stringify on the client. It must cross
  // the server-action boundary as a string: ProseMirror builds each node's
  // `attrs` with Object.create(null), and React's server-action serializer drops
  // null-prototype objects, silently stripping all `attrs` (e.g. textAlign).
  json: string;
  title: string;
  description: string;
  access: number;
  /** Where to land after saving. Defaults to the list the post now belongs to. */
  redirectTo?: string;
}) {
  // Abandoned upload placeholders must never reach storage: the read-only
  // renderer has no extension for them and throws (see stripEditorOnlyNodes).
  const body = stripEditorOnlyNodes(JSON.parse(input.json) as JSONContent);

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
    post_body: body,
    post_description,
    post_date: today(),
    access_type,
  };
  await createPost(postData);
  revalidatePath("/posts");
  revalidatePath("/drafts");
  redirect(safeRedirect(input.redirectTo, access_type === ACCESS_DRAFT ? "/drafts" : "/posts"));
}

export async function editPostHandler(input: {
  id: number;
  // See createPostHandler: the document crosses as a string so node `attrs`
  // (null-prototype objects) survive server-action serialization.
  json: string;
  title: string;
  description: string;
  access: number;
  /** Where to land after saving. Defaults to the post's own page. */
  redirectTo?: string;
}) {
  // Abandoned upload placeholders must never reach storage: the read-only
  // renderer has no extension for them and throws (see stripEditorOnlyNodes).
  const body = stripEditorOnlyNodes(JSON.parse(input.json) as JSONContent);

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

  const oldPathnames = extractImagePathnames(post.post_body_json);
  const newPathnames = new Set(extractImagePathnames(body));
  const droppedPathnames = oldPathnames.filter((p) => !newPathnames.has(p));

  const postData: EditPostInput = {
    id: input.id,
    post_name,
    post_body: body,
    post_description,
    post_edit_date: today(),
    access_type,
  };

  await editPost(postData);
  revalidatePath("/posts");
  revalidatePath("/drafts");
  revalidatePath(`/posts/${input.id}`);

  if (droppedPathnames.length > 0) {
    // Best-effort: the edit already succeeded, so a storage cleanup failure
    // here shouldn't fail the save from the user's perspective.
    await del(droppedPathnames).catch((error) => {
      console.error("Failed to delete removed post images:", error);
    });
  }

  // A post that's still a draft has no view page to land on, so fall back to
  // the drafts list instead of a route that would 404.
  redirect(safeRedirect(input.redirectTo, access_type === ACCESS_DRAFT ? "/drafts" : `/posts/${input.id}`));
}

export async function deletePostAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) throw new Error("Invalid id");

  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const post = await getPostById(id);
  if (!post) throw new Error("Post not found");
  if (post.post_author !== session.user.id) throw new Error("Not authorised");

  const pathnames = extractImagePathnames(post.post_body_json);

  await deletePostById(id);
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/archive");

  if (pathnames.length > 0) {
    // Best-effort: the post row is already gone, so a storage cleanup failure
    // here shouldn't fail the delete action from the user's perspective.
    await del(pathnames).catch((error) => {
      console.error("Failed to delete post images:", error);
    });
  }

  // Deleting from a list leaves you on that list, so the caller says nothing
  // and this returns. Deleting from the post's own page would strand you on a
  // route whose post no longer exists, so that caller passes somewhere to go.
  // `redirect` throws, which is why it runs last — after the row and its images
  // are already gone.
  const redirectTo = formData.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo) {
    redirect(safeRedirect(redirectTo, "/posts"));
  }
}
