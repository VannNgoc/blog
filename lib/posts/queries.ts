import "server-only";
import { sql } from "@/lib/db";
import type { PostRow, PostWithAuthorRow } from "@/type/post";

export async function getPosts(userID: string | undefined) {
  const posts = (await sql`
    SELECT
      p.id,
      p.post_name,
      p.post_author,
      p.post_date,
      p.post_edit_date,
      p.post_body,
      p.access,
      u.username
    FROM "POSTS" AS p
    INNER JOIN "USERS" AS u ON p.post_author = u.id
    WHERE p.access = 1
    ORDER BY post_date DESC, id DESC
  `) as PostWithAuthorRow[];
  return posts;
}

export async function getUserPosts(userID: string) {
  const posts = (await sql`
    SELECT
      p.id,
      p.post_name,
      p.post_author,
      p.post_date,
      p.post_edit_date,
      p.post_body,
      p.access,
      u.username
    FROM "POSTS" AS p
    INNER JOIN "USERS" AS u ON p.post_author = u.id
    WHERE p.post_author = ${userID}
    ORDER BY post_date DESC, id DESC
  `) as PostWithAuthorRow[];
  return posts;
}

export async function getPostById(id: number) {
  const rows = (await sql`
    SELECT
      p.id,
      p.post_name,
      p.post_author,
      p.post_date,
      p.post_edit_date,
      p.post_body,
      p.access,
      u.username
    FROM "POSTS" AS p
    INNER JOIN "USERS" AS u ON p.post_author = u.id
    WHERE p.id = ${id}
  `) as PostWithAuthorRow[];
  return rows[0];
}

export async function getAdjacentPosts(input: { id: number; post_date: Date; user_id?: string }) {
  const accessFilter = input.user_id
    ? sql`(access = 1 OR post_author = ${input.user_id})`
    : sql`access = 1`;

  const newer = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM "POSTS"
    WHERE (
      post_date > ${input.post_date}
      OR (post_date = ${input.post_date} AND id > ${input.id})
    )
    AND ${accessFilter}
    ORDER BY post_date ASC, id ASC
    LIMIT 1
  `) as PostRow[];

  const older = (await sql`
    SELECT id, post_name, post_date, post_body, post_tags
    FROM "POSTS"
    WHERE (
      post_date < ${input.post_date}
      OR (post_date = ${input.post_date} AND id < ${input.id})
    )
    AND ${accessFilter}
    ORDER BY post_date DESC, id DESC
    LIMIT 1
  `) as PostRow[];

  return { newer: newer[0], older: older[0] };
}