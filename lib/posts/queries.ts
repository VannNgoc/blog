import "server-only";
import { sql } from "@/lib/db";
import type { PostRow, PostWithAuthorRow } from "@/type/post";

import { ACCESS_DRAFT, ACCESS_PRIVATE, ACCESS_PUBLIC, PAGINATION_LIMIT } from '@/lib/constants'

// Trash: a deleted post keeps its row, with `deleted_at` set, until the nightly
// cron purges it. That makes every query below one more door a trashed post
// could walk back out through, so each one filters on `deleted_at IS NULL`
// explicitly. The only deliberate exceptions are the trash's own queries and
// getAllPostBodies, whose blob sweep must keep a trashed post's images alive
// for as long as the post can still be restored.

export async function getPostsCount({ isPublic }: { isPublic: boolean }){
  const [{ count }] = isPublic
  ? await sql`SELECT COUNT(*) FROM "POSTS" WHERE access = 1 AND deleted_at IS NULL`
  : await sql`SELECT COUNT(*) FROM "POSTS" WHERE deleted_at IS NULL`;
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
    WHERE p.access = 1 AND p.deleted_at IS NULL
    ORDER BY post_date DESC, id DESC
    LIMIT ${PAGINATION_LIMIT} OFFSET ${(currentPage - 1) * PAGINATION_LIMIT}
  `) as PostWithAuthorRow[];
  return posts;
}

/** Every public post, titles and dates only, newest first.
 *
 *  Unpaginated on purpose — seeing the whole run at once is the point of an
 *  archive, and the payload is three columns per row rather than a post body.
 *  Note what this deliberately does *not* select: `post_body_json`. The other
 *  listing queries pull whole bodies to derive a one-paragraph preview, which
 *  is fine at ten rows a page and would not be fine across every post at once.
 *
 *  Public posts only, matching /posts. An author's private work has its own
 *  home on the dashboard, so this needs no access parameter and no session. */
export async function getPublicPostArchive() {
  const posts = (await sql`
    SELECT p.id, p.post_name, p.post_date
    FROM "POSTS" AS p
    WHERE p.access = ${ACCESS_PUBLIC} AND p.deleted_at IS NULL
    ORDER BY post_date DESC, id DESC
  `) as Pick<PostRow, "id" | "post_name" | "post_date">[];
  return posts;
}

/** Filters the dashboard archive can apply, all optional and all combinable. */
export type ArchiveFilters = {
  /** A single ACCESS_* value. Omitted means "everything except drafts" — they
      are unfinished work and have their own page, so they stay out unless
      explicitly asked for. */
  access?: number;
  /** Any number of "YYYY-MM" months, unioned. Matched against post_date, which
      is a DATE with no zone, so formatting it in SQL avoids the local-vs-UTC
      shift a JS Date would introduce. */
  months?: string[];
  /** Full-text search, sharing the public feed's match rules. */
  q?: string;
};

/** Everything an author has published or kept private, titles and dates only.
 *
 *  The dashboard's counterpart to getPublicPostArchive: scoped to one author
 *  and carrying `access` so each row can show its state. Unpaginated on
 *  purpose — filtering a paginated index would hide matches below a page
 *  boundary, which is the opposite of what someone filtering wants.
 *
 *  Every filter is composed as a fragment defaulting to TRUE, so the shape of
 *  the query never changes with the combination applied to it. */
export async function getUserPostArchive(userID: string, filters: ArchiveFilters = {}) {
  const accessFilter =
    filters.access !== undefined
      ? sql`p.access = ${filters.access}`
      : sql`p.access != ${ACCESS_DRAFT}`;

  // `= ANY(array)` rather than a generated IN list: one bound parameter whatever
  // the selection size, so the query plan is identical for one month or twelve.
  const monthFilter = filters.months?.length
    ? sql`to_char(p.post_date, 'YYYY-MM') = ANY(${filters.months})`
    : sql`TRUE`;

  const searchFilter = filters.q ? searchMatchFilter(filters.q, userID) : sql`TRUE`;

  const posts = (await sql`
    SELECT p.id, p.post_name, p.post_date, p.access
    FROM "POSTS" AS p
    WHERE p.post_author = ${userID}
      AND p.deleted_at IS NULL
      AND ${accessFilter}
      AND ${monthFilter}
      AND ${searchFilter}
    ORDER BY post_date DESC, id DESC
  `) as (Pick<PostRow, "id" | "post_name" | "post_date"> & { access: number })[];
  return posts;
}

/** The three numbers the dashboard leads with, in one round trip rather than
 *  three. FILTER is doing the work a WHERE can't here — one pass, three counts. */
export async function getUserPostCounts(userID: string) {
  const [row] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE access = ${ACCESS_PUBLIC})  AS published,
      COUNT(*) FILTER (WHERE access = ${ACCESS_PRIVATE}) AS private,
      COUNT(*) FILTER (WHERE access = ${ACCESS_DRAFT})   AS drafts
    FROM "POSTS"
    WHERE post_author = ${userID} AND deleted_at IS NULL
  `;
  return {
    published: Number(row.published),
    private: Number(row.private),
    drafts: Number(row.drafts),
  };
}

/** Posts per calendar month for the last `months` months, oldest first.
 *
 *  A generated series left-joined against the posts, so months with nothing in
 *  them come back as zero rather than being missing — otherwise a gap in the
 *  writing habit would render as a shorter strip instead of an empty column,
 *  which is precisely the thing worth seeing. */
export async function getUserPostCadence(userID: string, months = 12) {
  const rows = (await sql`
    SELECT to_char(m.month, 'YYYY-MM') AS month, COUNT(p.id) AS count
    FROM generate_series(
      date_trunc('month', CURRENT_DATE) - make_interval(months => ${months - 1}),
      date_trunc('month', CURRENT_DATE),
      '1 month'
    ) AS m(month)
    LEFT JOIN "POSTS" AS p
      ON date_trunc('month', p.post_date) = m.month
     AND p.post_author = ${userID}
     AND p.access != ${ACCESS_DRAFT}
     AND p.deleted_at IS NULL
    GROUP BY m.month
    ORDER BY m.month
  `) as { month: string; count: string }[];
  return rows.map((r) => ({ month: r.month, count: Number(r.count) }));
}

/** The dashboard is the author's own shelf: their published and private posts.
    Drafts are excluded here; they live on /drafts. */
export async function getUserPostsCount(userID: string) {
  const [{ count }] = await sql`SELECT COUNT(*) FROM "POSTS" WHERE post_author = ${userID} AND access != ${ACCESS_DRAFT} AND deleted_at IS NULL`;
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
    WHERE p.post_author = ${userID} AND p.access != ${ACCESS_DRAFT} AND p.deleted_at IS NULL
    ORDER BY post_date DESC, id DESC
    LIMIT ${PAGINATION_LIMIT} OFFSET ${(currentPage - 1) * PAGINATION_LIMIT}
  `) as PostWithAuthorRow[];
  return posts;
}

export async function getUserDraftsCount(userID: string) {
  const [{ count }] = await sql`SELECT COUNT(*) FROM "POSTS" WHERE access = ${ACCESS_DRAFT} AND post_author = ${userID} AND deleted_at IS NULL`;
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
    WHERE p.access = ${ACCESS_DRAFT} AND p.post_author = ${userID} AND p.deleted_at IS NULL
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
    WHERE p.id = ${id} AND p.deleted_at IS NULL
  `) as PostWithAuthorRow[];
  return rows[0];
}

/** Like getPostById, but finds a post whether or not it's in the trash, and
    says which. Only for the trash's own actions (restore, delete forever);
    everything a reader can reach goes through getPostById instead. */
export async function getPostByIdIncludingTrashed(id: number) {
  const rows = (await sql`
    SELECT p.id, p.post_author, p.post_body_json, p.deleted_at
    FROM "POSTS" AS p
    WHERE p.id = ${id}
  `) as (Pick<PostRow, "id" | "post_author" | "post_body_json"> & { deleted_at: Date | null })[];
  return rows[0];
}

/** An author's trashed posts, most recently trashed first.

    Unpaginated: the trash empties itself after TRASH_RETENTION_DAYS, so it
    stays short. */
export async function getUserTrashedPosts(userID: string) {
  const rows = (await sql`
    SELECT p.id, p.post_name, p.post_date, p.access, p.deleted_at
    FROM "POSTS" AS p
    WHERE p.post_author = ${userID} AND p.deleted_at IS NOT NULL
    ORDER BY p.deleted_at DESC, p.id DESC
  `) as (Pick<PostRow, "id" | "post_name" | "post_date" | "access"> & { deleted_at: Date })[];
  return rows;
}

/** Permanently removes posts that have sat in the trash longer than `days`.

    Run by the nightly cron *before* it sweeps storage, so the images of the
    posts removed here are recognised as unreferenced in the same run. */
export async function deleteExpiredTrash(days: number) {
  const rows = (await sql`
    DELETE FROM "POSTS"
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - make_interval(days => ${days})
    RETURNING id
  `) as { id: number }[];
  return rows.length;
}

/** Everything an author has written, for them to download: every access
    level including drafts, and whole bodies, oldest first so the file reads in
    the order it was written. Trashed posts are left out, since deleting one
    means you didn't want to keep it. */
export async function getUserPostsForExport(userID: string) {
  const rows = (await sql`
    SELECT p.id, p.post_name, p.post_description, p.post_date, p.post_edit_date, p.access, p.post_body_json
    FROM "POSTS" AS p
    WHERE p.post_author = ${userID} AND p.deleted_at IS NULL
    ORDER BY p.post_date ASC, p.id ASC
  `) as Pick<
    PostRow,
    "id" | "post_name" | "post_description" | "post_date" | "post_edit_date" | "access" | "post_body_json"
  >[];
  return rows;
}

/** An author's posts from this calendar day in earlier years, newest first.

    `today` is YYYY-MM-DD in the site's time zone (see todayInSiteTimeZone),
    passed in rather than read from the database clock, which runs in UTC and
    would flip to tomorrow's anniversaries every evening. Matching on the
    formatted month and day means a February 29 post only resurfaces in leap
    years, which is the honest answer. Drafts are left out: they were never
    finished, so there's no "you wrote this" to remember. */
export async function getUserOnThisDay(userID: string, today: string) {
  const [year, month, day] = today.split("-");
  const rows = (await sql`
    SELECT p.id, p.post_name, p.post_date
    FROM "POSTS" AS p
    WHERE p.post_author = ${userID}
      AND p.access != ${ACCESS_DRAFT}
      AND p.deleted_at IS NULL
      AND to_char(p.post_date, 'MM-DD') = ${`${month}-${day}`}
      AND p.post_date < ${`${year}-01-01`}
    ORDER BY p.post_date DESC, p.id DESC
  `) as Pick<PostRow, "id" | "post_name" | "post_date">[];
  return rows;
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
      AND deleted_at IS NULL
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
      AND deleted_at IS NULL
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
      AND p.deleted_at IS NULL
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
      AND p.deleted_at IS NULL
      AND ${searchMatchFilter(searchString, authorID)}
  `;
  return count;
}
