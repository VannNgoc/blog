import "server-only";
import { unstable_cache } from "next/cache";
import {
  getPosts,
  getPostsCount,
  getPublicPostArchive,
  getPostById,
} from "@/lib/posts/queries";
import type { PostRow, PostWithAuthorRow } from "@/type/post";

/**
 * Cached wrappers around the queries that serve anonymous, public traffic:
 * the shared post list, the archive, and a single post's own page.
 *
 * Every route that calls these (`/posts`, `/archive`, `/posts/[id]`) is
 * `force-dynamic` — the per-request CSP nonce in proxy.ts requires it — so
 * without this, every single visit still re-ran the query against Neon, even
 * though the *data* a public post shows doesn't depend on who's asking or
 * which nonce got minted for the request. Wrapping just the query in Next's
 * Data Cache keeps the per-request nonce/CSP work while skipping the round
 * trip to the database on a cache hit, which matters most against a Neon
 * cold start.
 *
 * Deliberately not used for anything an authorization check depends on —
 * the dashboard, drafts, trash, and the editor keep calling the plain
 * queries in lib/posts/queries.ts directly, so they always read a fresh row.
 *
 * Invalidated from lib/posts/actions.ts via `updateTag` whenever a post is
 * created, edited, trashed, restored, or purged; the `revalidate` below is
 * only a safety net (e.g. an author's display name changing outside this
 * app), not the primary invalidation path.
 */

/** Every cache entry here that lists or counts public posts. */
export const PUBLIC_POSTS_TAG = "posts";
/** A single post's own cache entry — bundled with PUBLIC_POSTS_TAG above so
    invalidating one post doesn't also have to blow away the whole list. */
export const postTag = (id: number) => `post:${id}`;

const REVALIDATE_SECONDS = 3600;

/** unstable_cache round-trips its result through JSON, so Date columns come
    back as strings. Restores them for callers that rely on Date behaviour —
    e.g. PostArchiveList's archiveDay(), or getAdjacentPosts' post_date arg. */
function reviveDates<T extends { post_date: unknown; post_edit_date?: unknown }>(row: T): T {
  return {
    ...row,
    post_date: new Date(row.post_date as string),
    ...(row.post_edit_date !== undefined
      ? {
          post_edit_date: row.post_edit_date ? new Date(row.post_edit_date as string) : null,
        }
      : {}),
  };
}

const cachedGetPublicPosts = unstable_cache(
  // getPosts ignores its user-id argument entirely when nothing is passed —
  // this is the same public feed for every visitor, so one cache entry per
  // page is shared across all of them.
  (page: number) => getPosts(undefined, page),
  ["public-posts"],
  { revalidate: REVALIDATE_SECONDS, tags: [PUBLIC_POSTS_TAG] },
);

/** The shared, unsearched public feed (`/posts`). Search stays live — it's
    per-query traffic, not the kind of shared read this cache is for. */
export async function getCachedPublicPosts(page: number): Promise<PostWithAuthorRow[]> {
  const posts = await cachedGetPublicPosts(page);
  return posts.map(reviveDates);
}

const cachedGetPublicPostsCount = unstable_cache(
  () => getPostsCount({ isPublic: true }),
  ["public-posts-count"],
  { revalidate: REVALIDATE_SECONDS, tags: [PUBLIC_POSTS_TAG] },
);

export function getCachedPublicPostsCount() {
  return cachedGetPublicPostsCount();
}

const cachedGetPublicArchive = unstable_cache(
  () => getPublicPostArchive(),
  ["public-archive"],
  { revalidate: REVALIDATE_SECONDS, tags: [PUBLIC_POSTS_TAG] },
);

/** The public archive (`/archive`) — every public post, titles and dates only. */
export async function getCachedPublicArchive(): Promise<Pick<PostRow, "id" | "post_name" | "post_date">[]> {
  const posts = await cachedGetPublicArchive();
  return posts.map(reviveDates);
}

/** A single post, by id — `/posts/[id]` and the public-image lookup in
    app/api/file/route.ts both read a post before deciding who can see it.
    Tagged per-id (in addition to PUBLIC_POSTS_TAG) so editing one post
    doesn't invalidate every other post's already-cached page.
    `unstable_cache`'s `tags` option is fixed when it's built, not per call,
    so the wrapper itself has to be built fresh per id — the underlying Data
    Cache entry is still shared across requests by its key, so this doesn't
    cost an extra round trip on a cache hit. */
export async function getCachedPostById(id: number): Promise<PostWithAuthorRow | undefined> {
  const cached = unstable_cache(() => getPostById(id), [`post-by-id-${id}`], {
    revalidate: REVALIDATE_SECONDS,
    tags: [PUBLIC_POSTS_TAG, postTag(id)],
  });
  const post = await cached();
  return post ? reviveDates(post) : post;
}
