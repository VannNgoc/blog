'use server';
import "server-only";
import { del } from "@vercel/blob";
import { sql } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { postMetaSchema } from "@/schemas/post-form";
import type { EditPostInput, NewPostInput, PostRow } from "@/type/post";
import { auth } from '@/lib/auth/server';
import { ACCESS_DRAFT } from '@/lib/constants';
import { getPostById, getPostByIdIncludingTrashed } from '@/lib/posts/queries';
import { PUBLIC_POSTS_TAG, postTag } from '@/lib/posts/cached';
import { extractImagePathnames } from '@/lib/tiptap-utils';
import type { JSONContent } from "@tiptap/core";
import { stripEditorOnlyNodes } from "@/lib/tiptap-content";
import { todayInSiteTimeZone } from "@/lib/dates";

// Data-layer mutation functions
export async function createPost(postData: NewPostInput): Promise<number> {
  const { post_name, post_author, post_body, post_description, post_date, access_type } = postData;
  const [row] = (await sql`
    INSERT INTO "POSTS" (post_name, post_author, post_body_json, post_description, post_date, access)
    VALUES (${post_name}, ${post_author}, ${post_body}, ${post_description}, ${post_date}, ${access_type})
    RETURNING id
  `) as { id: number }[];
  return row?.id;
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

/** What a save hands back when it doesn't redirect.
 *
 *  Expected failures are *returned*, not thrown: in production Next.js replaces
 *  a thrown server-action error's message with a generic one, so the editor
 *  couldn't tell "title missing" from "signed out" and would have nothing
 *  useful to show. Unexpected failures (a database outage) still throw. */
export type SaveResult = { error: string } | { id: number };

type SaveInput = {
  // Tiptap document, serialized with JSON.stringify on the client. It must cross
  // the server-action boundary as a string: ProseMirror builds each node's
  // `attrs` with Object.create(null), and React's server-action serializer drops
  // null-prototype objects, silently stripping all `attrs` (e.g. textAlign).
  json: string;
  title: string;
  description: string;
  access: number;
  /** Where to land after saving. Ignored when `stay` is set. */
  redirectTo?: string;
  /** Save in place (Ctrl/Cmd+S): return the post's id instead of redirecting. */
  stay?: boolean;
};

const SIGNED_OUT_ERROR = "You've been signed out. Sign in again in another tab, then save.";

function parseMeta(input: SaveInput) {
  return postMetaSchema.safeParse({
    title: input.title,
    description: input.description,
    access: input.access,
  });
}

// Server action handlers that orchestrate mutations
export async function createPostHandler(input: SaveInput): Promise<SaveResult> {
  const meta = parseMeta(input);
  if (!meta.success) return { error: meta.error.issues[0]?.message ?? "Check the post's details." };
  const { title: post_name, description: post_description, access: access_type } = meta.data;

  const { data: session } = await auth.getSession();
  if (!session?.user) return { error: SIGNED_OUT_ERROR };

  // Abandoned upload placeholders must never reach storage: the read-only
  // renderer has no extension for them and throws (see stripEditorOnlyNodes).
  const body = stripEditorOnlyNodes(JSON.parse(input.json) as JSONContent);

  const postData: NewPostInput = {
    post_name,
    post_author: session.user.id,
    post_body: body,
    post_description,
    post_date: todayInSiteTimeZone(),
    access_type,
  };
  const id = await createPost(postData);
  revalidatePath("/posts");
  revalidatePath("/drafts");
  updateTag(PUBLIC_POSTS_TAG);

  if (input.stay) return { id };
  redirect(safeRedirect(input.redirectTo, access_type === ACCESS_DRAFT ? "/drafts" : "/posts"));
}

export async function editPostHandler(input: SaveInput & { id: number }): Promise<SaveResult> {
  const meta = parseMeta(input);
  if (!meta.success) return { error: meta.error.issues[0]?.message ?? "Check the post's details." };
  const { title: post_name, description: post_description, access: access_type } = meta.data;

  const { data: session } = await auth.getSession();
  if (!session?.user) return { error: SIGNED_OUT_ERROR };

  const post = await getPostById(input.id);
  if (!post) return { error: "This post no longer exists." };
  if (post.post_author !== session.user.id) return { error: "You can only edit your own posts." };

  // See createPostHandler: placeholders are stripped before anything is stored.
  const body = stripEditorOnlyNodes(JSON.parse(input.json) as JSONContent);

  const oldPathnames = extractImagePathnames(post.post_body_json);
  const newPathnames = new Set(extractImagePathnames(body));
  const droppedPathnames = oldPathnames.filter((p) => !newPathnames.has(p));

  const postData: EditPostInput = {
    id: input.id,
    post_name,
    post_body: body,
    post_description,
    post_edit_date: todayInSiteTimeZone(),
    access_type,
  };

  await editPost(postData);
  revalidatePath("/posts");
  revalidatePath("/drafts");
  revalidatePath(`/posts/${input.id}`);
  updateTag(PUBLIC_POSTS_TAG);
  updateTag(postTag(input.id));

  if (droppedPathnames.length > 0) {
    // Best-effort: the edit already succeeded, so a storage cleanup failure
    // here shouldn't fail the save from the user's perspective.
    await del(droppedPathnames).catch((error) => {
      console.error("Failed to delete removed post images:", error);
    });
  }

  if (input.stay) return { id: input.id };
  // A post that's still a draft has no view page to land on, so fall back to
  // the drafts list instead of a route that would 404.
  redirect(safeRedirect(input.redirectTo, access_type === ACCESS_DRAFT ? "/drafts" : `/posts/${input.id}`));
}

/** Every page a post's presence (or absence) shows up on. */
function revalidatePostLists(id: number) {
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/drafts");
  revalidatePath("/archive");
  revalidatePath("/trash");
  updateTag(PUBLIC_POSTS_TAG);
  updateTag(postTag(id));
}

/** Reads a post id from a form and confirms the signed-in user wrote that post,
    whether or not it's in the trash. */
async function authorisedTrashTarget(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) throw new Error("Invalid id");

  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const post = await getPostByIdIncludingTrashed(id);
  if (!post) throw new Error("Post not found");
  if (post.post_author !== session.user.id) throw new Error("Not authorised");
  return post;
}

/** "Delete" moves a post to the trash. Its row and images stay put, so it can
    be restored until the nightly cron purges it (see deleteExpiredTrash). */
export async function deletePostAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) throw new Error("Invalid id");

  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  // getPostById skips trashed posts, so trashing one twice is "not found"
  // rather than a silent reset of its purge date.
  const post = await getPostById(id);
  if (!post) throw new Error("Post not found");
  if (post.post_author !== session.user.id) throw new Error("Not authorised");

  await sql`
    UPDATE "POSTS" SET deleted_at = now()
    WHERE id = ${id} AND deleted_at IS NULL
  `;
  revalidatePostLists(id);

  // Deleting from a list leaves you on that list, so the caller says nothing
  // and this returns. Deleting from the post's own page would strand you on a
  // route whose post is now gone, so that caller passes somewhere to go.
  // `redirect` throws, which is why it runs last.
  const redirectTo = formData.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo) {
    redirect(safeRedirect(redirectTo, "/posts"));
  }
}

/** Takes a post back out of the trash, exactly as it was: same access level,
    same date, same images. */
export async function restorePostAction(formData: FormData) {
  const post = await authorisedTrashTarget(formData);

  await sql`UPDATE "POSTS" SET deleted_at = NULL WHERE id = ${post.id}`;
  revalidatePostLists(post.id);
}

/** Removes a trashed post and its images immediately, without waiting for the
    nightly purge. Only a post already in the trash qualifies, so this can never
    be the first and only step between a live post and losing it. */
export async function deletePostForeverAction(formData: FormData) {
  const post = await authorisedTrashTarget(formData);
  if (!post.deleted_at) throw new Error("Only posts in the trash can be deleted forever");

  const pathnames = extractImagePathnames(post.post_body_json);

  await deletePostById(post.id);
  revalidatePath("/trash");
  updateTag(PUBLIC_POSTS_TAG);
  updateTag(postTag(post.id));

  if (pathnames.length > 0) {
    // Best-effort: the post row is already gone, so a storage cleanup failure
    // here shouldn't fail the action. The nightly sweep catches any leftovers.
    await del(pathnames).catch((error) => {
      console.error("Failed to delete post images:", error);
    });
  }
}
