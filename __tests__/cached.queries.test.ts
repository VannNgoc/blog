// Passthrough: the real unstable_cache needs a live Next.js request context
// (its Data Cache) that doesn't exist in Jest. The mock still records every
// call so tests can check the tags/keyParts each wrapper registers.
jest.mock("next/cache", () => ({
  unstable_cache: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

jest.mock("@/lib/posts/queries", () => ({
  getPosts: jest.fn(),
  getPostsCount: jest.fn(),
  getPublicPostArchive: jest.fn(),
  getPostById: jest.fn(),
}));

jest.mock("server-only", () => ({}));

import { unstable_cache } from "next/cache";
import {
  getPosts,
  getPostsCount,
  getPublicPostArchive,
  getPostById,
} from "@/lib/posts/queries";
import {
  getCachedPublicPosts,
  getCachedPublicPostsCount,
  getCachedPublicArchive,
  getCachedPostById,
  PUBLIC_POSTS_TAG,
  postTag,
} from "@/lib/posts/cached";

const mockUnstableCache = unstable_cache as jest.Mock;
const mockGetPosts = getPosts as jest.Mock;
const mockGetPostsCount = getPostsCount as jest.Mock;
const mockGetPublicPostArchive = getPublicPostArchive as jest.Mock;
const mockGetPostById = getPostById as jest.Mock;

/** Finds the unstable_cache() call whose keyParts start with this string,
    and returns the options object it registered its tags with. */
function tagsFor(keyPartsPrefix: string) {
  const call = mockUnstableCache.mock.calls.find(([, keyParts]) =>
    (keyParts as string[] | undefined)?.[0]?.startsWith(keyPartsPrefix),
  );
  return (call?.[2] as { tags?: string[] } | undefined)?.tags;
}

// Not mockUnstableCache: the three top-level wrappers in cached.ts call
// unstable_cache() exactly once, at module import — clearing that mock's
// history here would erase the only record of those calls before the tests
// checking their tags ever run.
beforeEach(() => {
  mockGetPosts.mockReset();
  mockGetPostsCount.mockReset();
  mockGetPublicPostArchive.mockReset();
  mockGetPostById.mockReset();
});

const authoredPost = {
  id: 1,
  post_name: "A Post",
  post_author: "user-1",
  post_date: "2024-05-01",
  post_edit_date: "2024-05-02",
  post_body_json: {},
  post_description: null,
  access: 1,
  username: "author",
};

describe("getCachedPublicPosts", () => {
  it("revives post_date and post_edit_date as real Dates", async () => {
    mockGetPosts.mockResolvedValueOnce([authoredPost]);

    const [post] = await getCachedPublicPosts(1);

    expect(post.post_date).toBeInstanceOf(Date);
    expect(post.post_edit_date).toBeInstanceOf(Date);
    expect(post.post_date.toISOString()).toBe(new Date("2024-05-01").toISOString());
  });

  it("leaves a null post_edit_date as null rather than reviving it", async () => {
    mockGetPosts.mockResolvedValueOnce([{ ...authoredPost, post_edit_date: null }]);

    const [post] = await getCachedPublicPosts(1);

    expect(post.post_edit_date).toBeNull();
  });

  it("passes the requested page through, ignoring any user id", async () => {
    mockGetPosts.mockResolvedValueOnce([]);

    await getCachedPublicPosts(3);

    expect(mockGetPosts).toHaveBeenCalledWith(undefined, 3);
  });

  it("tags its cache entry with the shared public-posts tag", async () => {
    mockGetPosts.mockResolvedValueOnce([]);

    await getCachedPublicPosts(1);

    expect(tagsFor("public-posts")).toEqual([PUBLIC_POSTS_TAG]);
  });
});

describe("getCachedPublicPostsCount", () => {
  it("passes the count straight through, unchanged", async () => {
    mockGetPostsCount.mockResolvedValueOnce("7");

    await expect(getCachedPublicPostsCount()).resolves.toBe("7");
    expect(mockGetPostsCount).toHaveBeenCalledWith({ isPublic: true });
  });

  it("tags its cache entry with the shared public-posts tag", async () => {
    mockGetPostsCount.mockResolvedValueOnce("0");

    await getCachedPublicPostsCount();

    expect(tagsFor("public-posts-count")).toEqual([PUBLIC_POSTS_TAG]);
  });
});

describe("getCachedPublicArchive", () => {
  it("revives post_date without requiring a post_edit_date column", async () => {
    mockGetPublicPostArchive.mockResolvedValueOnce([
      { id: 5, post_name: "Archived", post_date: "2023-12-25" },
    ]);

    const [post] = await getCachedPublicArchive();

    expect(post.post_date).toBeInstanceOf(Date);
    expect("post_edit_date" in post).toBe(false);
  });

  it("tags its cache entry with the shared public-posts tag", async () => {
    mockGetPublicPostArchive.mockResolvedValueOnce([]);

    await getCachedPublicArchive();

    expect(tagsFor("public-archive")).toEqual([PUBLIC_POSTS_TAG]);
  });
});

describe("getCachedPostById", () => {
  it("returns undefined for a post that doesn't exist, without reviving anything", async () => {
    mockGetPostById.mockResolvedValueOnce(undefined);

    await expect(getCachedPostById(999)).resolves.toBeUndefined();
  });

  it("revives its dates like the other wrappers", async () => {
    mockGetPostById.mockResolvedValueOnce({ ...authoredPost, id: 42, post_edit_date: null });

    const post = await getCachedPostById(42);

    expect(post!.post_date).toBeInstanceOf(Date);
    expect(post!.post_edit_date).toBeNull();
  });

  it("tags its cache entry with both the shared and the post's own tag", async () => {
    mockGetPostById.mockResolvedValueOnce({ ...authoredPost, id: 42 });

    await getCachedPostById(42);

    expect(tagsFor("post-by-id-42")).toEqual([PUBLIC_POSTS_TAG, postTag(42)]);
  });

  it("builds a distinct cache entry per post id", async () => {
    mockGetPostById.mockResolvedValueOnce({ ...authoredPost, id: 7 });

    await getCachedPostById(7);

    expect(tagsFor("post-by-id-7")).toEqual([PUBLIC_POSTS_TAG, postTag(7)]);
  });
});
