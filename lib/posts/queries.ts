import "server-only";
import { sql } from "@/lib/db";
import type { PostRow, PostWithAuthorRow } from "@/type/post";

import { PAGINATION_LIMIT } from '@/lib/constants'

export async function getPostsCount({ isPublic }: { isPublic: boolean }){
  const [{ count }] = isPublic
  ? await sql`SELECT COUNT(*) FROM "POSTS" WHERE access = 1`
  : await sql`SELECT COUNT(*) FROM "POSTS"`;
  return count;
}

export async function getPosts(userID: string | undefined, currentPage: number) {
  const posts = (await sql`
    SELECT
      p.id,
      p.post_name,
      p.post_author,
      p.post_date,
      p.post_edit_date,
      p.post_body_json,
      p.post_description,
      p.access,
      u.username
    FROM "POSTS" AS p
    INNER JOIN "USERS" AS u ON p.post_author = u.id
    WHERE p.access = 1
    ORDER BY post_date DESC, id DESC
    LIMIT ${PAGINATION_LIMIT} OFFSET ${(currentPage - 1) * PAGINATION_LIMIT}
  `) as PostWithAuthorRow[];
  return posts;
}

export async function getUserPostsCount(userID: string) {
  const [{ count }] = await sql`SELECT COUNT(*) FROM "POSTS" WHERE access = 1 OR post_author = ${userID}`;
  return count;
}

export async function getUserPosts(userID: string, currentPage: number) {
  const posts = (await sql`
    SELECT
      p.id,
      p.post_name,
      p.post_author,
      p.post_date,
      p.post_edit_date,
      p.post_body_json,
      p.post_description,
      p.access,
      u.username
    FROM "POSTS" AS p
    INNER JOIN "USERS" AS u ON p.post_author = u.id
    WHERE p.access = 1 OR p.post_author = ${userID}
    ORDER BY post_date DESC, id DESC
    LIMIT ${PAGINATION_LIMIT} OFFSET ${(currentPage - 1) * PAGINATION_LIMIT}
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
      p.post_body_json,
      p.post_description,
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
    SELECT id, post_name, post_date
    FROM "POSTS"
    WHERE (
      post_date > ${input.post_date}
      OR (post_date = ${input.post_date} AND id > ${input.id})
    )
    AND ${accessFilter}
    ORDER BY post_date ASC, id ASC
    LIMIT 1
  `) as Pick<PostRow, "id" | "post_name" | "post_date">[];

  const older = (await sql`
    SELECT id, post_name, post_date
    FROM "POSTS"
    WHERE (
      post_date < ${input.post_date}
      OR (post_date = ${input.post_date} AND id < ${input.id})
    )
    AND ${accessFilter}
    ORDER BY post_date DESC, id DESC
    LIMIT 1
  `) as Pick<PostRow, "id" | "post_name" | "post_date">[];

  return { newer: newer[0], older: older[0] };
}

export async function getSearchedPosts(searchString: string, userID: string | undefined, currentPage: number) {
  const accessFilter = userID
    ? sql`(p.access = 1 OR p.post_author = ${userID})`
    : sql`p.access = 1`;

  const posts = (await sql`
    SELECT
      p.id,
      p.post_name,
      p.post_author,
      p.post_date,
      p.post_edit_date,
      p.post_body_json,
      p.post_description,
      p.access,
      u.username
    FROM "POSTS" AS p
    INNER JOIN "USERS" AS u ON p.post_author = u.id
    WHERE ${accessFilter}
      AND p.search_vector @@ plainto_tsquery('english', ${searchString})
    ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', ${searchString})) DESC, post_date DESC, id DESC
    LIMIT ${PAGINATION_LIMIT} OFFSET ${(currentPage - 1) * PAGINATION_LIMIT}
  `) as PostWithAuthorRow[];
  return posts;
}

export async function getSearchedPostsCount(searchString: string, userID?: string) {
  const accessFilter = userID
    ? sql`(p.access = 1 OR p.post_author = ${userID})`
    : sql`p.access = 1`;

  const [{ count }] = await sql`
    SELECT COUNT(*) FROM "POSTS" AS p
    WHERE ${accessFilter}
      AND p.search_vector @@ plainto_tsquery('english', ${searchString})
  `;
  return count;
}
