import "server-only";
import { sql } from "@/lib/db";
import type { PostRow, PostWithAuthorRow } from "@/type/post";

import { ACCESS_DRAFT, PAGINATION_LIMIT } from '@/lib/constants'

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

/** The dashboard is the author's own shelf: their published and private posts.
    Drafts are excluded here; they live on /drafts. */
export async function getUserPostsCount(userID: string) {
  const [{ count }] = await sql`SELECT COUNT(*) FROM "POSTS" WHERE post_author = ${userID} AND access != ${ACCESS_DRAFT}`;
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
    WHERE p.post_author = ${userID} AND p.access != ${ACCESS_DRAFT}
    ORDER BY post_date DESC, id DESC
    LIMIT ${PAGINATION_LIMIT} OFFSET ${(currentPage - 1) * PAGINATION_LIMIT}
  `) as PostWithAuthorRow[];
  return posts;
}

export async function getUserDraftsCount(userID: string) {
  const [{ count }] = await sql`SELECT COUNT(*) FROM "POSTS" WHERE access = ${ACCESS_DRAFT} AND post_author = ${userID}`;
  return count;
}

export async function getUserDrafts(userID: string, currentPage: number) {
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
    WHERE p.access = ${ACCESS_DRAFT} AND p.post_author = ${userID}
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

/** Every post's body, for sweeping storage that's no longer referenced by any post. */
export async function getAllPostBodies() {
  const rows = (await sql`SELECT post_body_json FROM "POSTS"`) as Pick<PostRow, "post_body_json">[];
  return rows;
}

export async function getAdjacentPosts(input: { id: number; post_date: Date; user_id?: string }) {
  const accessFilter = input.user_id
    ? sql`(access = 1 OR (post_author = ${input.user_id} AND access != ${ACCESS_DRAFT}))`
    : sql`access = 1`;

  const [newer, older] = (await Promise.all([
    sql`
      SELECT id, post_name, post_date
      FROM "POSTS"
      WHERE (
        post_date > ${input.post_date}
        OR (post_date = ${input.post_date} AND id > ${input.id})
      )
      AND ${accessFilter}
      ORDER BY post_date ASC, id ASC
      LIMIT 1
    `,
    sql`
      SELECT id, post_name, post_date
      FROM "POSTS"
      WHERE (
        post_date < ${input.post_date}
        OR (post_date = ${input.post_date} AND id < ${input.id})
      )
      AND ${accessFilter}
      ORDER BY post_date DESC, id DESC
      LIMIT 1
    `,
  ])) as [
    Pick<PostRow, "id" | "post_name" | "post_date">[],
    Pick<PostRow, "id" | "post_name" | "post_date">[],
  ];

  return { newer: newer[0], older: older[0] };
}

/** A substring LIKE pattern, with the wildcards a user typed escaped so they
    match literally instead of widening the search. */
function usernamePattern(searchString: string) {
  return `%${searchString.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** What a search term is allowed to match.

    On the public feed a term matches a post's indexed content *or* its author's
    name, so "vanna" finds that author's posts. The username half is a substring
    ILIKE rather than another tsquery on purpose: names aren't english words, so
    stemming mangles them and whole-lexeme matching would miss the partial term
    someone types into a debounced box. It costs the GIN index on that branch,
    which is a fair trade at this table size.

    On the dashboard (authorID set) every row is already the viewer's own, so
    matching their own name would be noise: content only. */
function searchMatchFilter(searchString: string, authorID: string | undefined) {
  const contentMatch = sql`p.search_vector @@ plainto_tsquery('english', ${searchString})`;
  return authorID
    ? contentMatch
    : sql`(${contentMatch} OR u.username ILIKE ${usernamePattern(searchString)} ESCAPE '\\')`;
}

/** Pass an authorID to search that author's own posts (published and private,
    no drafts); pass undefined to search the public feed. */
export async function getSearchedPosts(searchString: string, authorID: string | undefined, currentPage: number) {
  const accessFilter = authorID
    ? sql`(p.post_author = ${authorID} AND p.access != ${ACCESS_DRAFT})`
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
      AND ${searchMatchFilter(searchString, authorID)}
    ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', ${searchString})) DESC, post_date DESC, id DESC
    LIMIT ${PAGINATION_LIMIT} OFFSET ${(currentPage - 1) * PAGINATION_LIMIT}
  `) as PostWithAuthorRow[];
  return posts;
}

/** Counterpart to getSearchedPosts; same authorID semantics. The join to USERS
    is what makes the author name matchable, and it keeps this count in step with
    the list query above, which has always inner-joined. */
export async function getSearchedPostsCount(searchString: string, authorID?: string) {
  const accessFilter = authorID
    ? sql`(p.post_author = ${authorID} AND p.access != ${ACCESS_DRAFT})`
    : sql`p.access = 1`;

  const [{ count }] = await sql`
    SELECT COUNT(*) FROM "POSTS" AS p
    INNER JOIN "USERS" AS u ON p.post_author = u.id
    WHERE ${accessFilter}
      AND ${searchMatchFilter(searchString, authorID)}
  `;
  return count;
}
