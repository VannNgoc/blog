import * as queries from "@/lib/posts/queries";

jest.mock("@/lib/db", () => ({ sql: jest.fn() }));
jest.mock("server-only", () => ({}));

import { sql } from "@/lib/db";

const mockSql = sql as unknown as jest.Mock;

type SqlCall = [TemplateStringsArray, ...unknown[]];

/** Every sql`` call a query made, fragments included, as one string. */
function allSql() {
  return (mockSql.mock.calls as SqlCall[]).map(([strings]) => strings.join(" ? ")).join("\n---\n");
}

beforeEach(() => {
  mockSql.mockReset();
  // Satisfies every query's destructuring: counts read `count`, the rest read rows.
  mockSql.mockResolvedValue([{ count: "0", published: 0, private: 0, drafts: 0 }]);
});

/**
 * A trashed post keeps its row, so any query that forgets the filter is a way
 * for it to reappear: on the public feed, in search, as a prev/next link, or
 * through /api/file. This table is meant to list every reader-facing query;
 * a new query that lists posts belongs in it.
 */
const readerQueries: [string, () => Promise<unknown>][] = [
  ["getPostsCount (public)", () => queries.getPostsCount({ isPublic: true })],
  ["getPostsCount (all)", () => queries.getPostsCount({ isPublic: false })],
  ["getPosts", () => queries.getPosts(undefined, 1)],
  ["getPublicPostArchive", () => queries.getPublicPostArchive()],
  ["getUserPostArchive", () => queries.getUserPostArchive("user-1")],
  ["getUserPostCounts", () => queries.getUserPostCounts("user-1")],
  ["getUserPostCadence", () => queries.getUserPostCadence("user-1")],
  ["getUserPostsCount", () => queries.getUserPostsCount("user-1")],
  ["getUserPosts", () => queries.getUserPosts("user-1", 1)],
  ["getUserDraftsCount", () => queries.getUserDraftsCount("user-1")],
  ["getUserDrafts", () => queries.getUserDrafts("user-1", 1)],
  ["getPostById", () => queries.getPostById(1)],
  ["getSearchedPosts (public)", () => queries.getSearchedPosts("walk", undefined, 1)],
  ["getSearchedPosts (author)", () => queries.getSearchedPosts("walk", "user-1", 1)],
  ["getSearchedPostsCount (public)", () => queries.getSearchedPostsCount("walk")],
  ["getSearchedPostsCount (author)", () => queries.getSearchedPostsCount("walk", "user-1")],
  ["getUserPostsForExport", () => queries.getUserPostsForExport("user-1")],
  ["getUserOnThisDay", () => queries.getUserOnThisDay("user-1", "2026-09-16")],
];

describe("trashed posts stay hidden", () => {
  it.each(readerQueries)("%s filters out trashed posts", async (_name, run) => {
    await run();
    expect(allSql()).toMatch(/deleted_at IS NULL/);
  });

  it("getAdjacentPosts filters trashed posts in both directions", async () => {
    await queries.getAdjacentPosts({ id: 1, post_date: new Date("2026-01-01") });
    const mainQueries = (mockSql.mock.calls as SqlCall[])
      .map(([strings]) => strings.join(" ? "))
      .filter((text) => text.includes("ORDER BY"));
    expect(mainQueries).toHaveLength(2);
    for (const text of mainQueries) expect(text).toMatch(/deleted_at IS NULL/);
  });

  /** The blob sweep must see a trashed post's images as still in use, or a
      restored post would come back with its pictures missing. */
  it("getAllPostBodies still includes trashed posts", async () => {
    await queries.getAllPostBodies();
    expect(allSql()).not.toMatch(/deleted_at/);
  });
});

describe("getUserOnThisDay", () => {
  it("matches today's month and day in earlier years only, skipping drafts", async () => {
    await queries.getUserOnThisDay("user-1", "2026-09-16");

    const text = allSql();
    const values = (mockSql.mock.calls as SqlCall[])[0].slice(1);
    expect(text).toMatch(/to_char\(p\.post_date, 'MM-DD'\) =/);
    expect(text).toMatch(/p\.post_date </);
    expect(text).toMatch(/p\.access !=/);
    expect(values).toEqual(["user-1", 4, "09-16", "2026-01-01"]);
  });
});

describe("trash queries", () => {
  it("getUserTrashedPosts lists only the author's trashed posts", async () => {
    await queries.getUserTrashedPosts("user-1");
    expect(allSql()).toMatch(/post_author =\s*\?\s*AND p\.deleted_at IS NOT NULL/);
  });

  it("deleteExpiredTrash removes only posts trashed longer than the retention window", async () => {
    mockSql.mockResolvedValueOnce([{ id: 3 }, { id: 4 }]);

    const removed = await queries.deleteExpiredTrash(30);

    const text = allSql();
    expect(text).toMatch(/DELETE FROM "POSTS"/);
    expect(text).toMatch(/deleted_at IS NOT NULL/);
    expect(text).toMatch(/deleted_at < now\(\) - make_interval\(days =>\s*\?\s*\)/);
    expect((mockSql.mock.calls as SqlCall[])[0].slice(1)).toEqual([30]);
    expect(removed).toBe(2);
  });
});
