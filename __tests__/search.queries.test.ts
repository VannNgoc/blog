import { getSearchedPosts, getSearchedPostsCount } from "@/lib/posts/queries";

jest.mock("@/lib/db", () => ({ sql: jest.fn() }));
jest.mock("server-only", () => ({}));

import { sql } from "@/lib/db";

const mockSql = sql as unknown as jest.Mock;

const mockPost = {
  id: 1,
  post_name: "Test Post",
  post_author: "user-1",
  post_date: "2024-01-01",
  post_edit_date: null,
  post_body: "Body text",
  access: 1,
  username: "vannaroth",
};

/** The queries build their WHERE clause from composed sql`` fragments, so a
    single search spans several calls to the mock: one per fragment, then the
    real query. These helpers flatten all of them so a test can assert on the
    predicate as a whole. */
type SqlCall = [TemplateStringsArray, ...unknown[]];

function allSql() {
  return (mockSql.mock.calls as SqlCall[]).map(([strings]) => strings.join(" ? ")).join("\n---\n");
}

function allValues() {
  return (mockSql.mock.calls as SqlCall[]).flatMap(([, ...values]) => values);
}

beforeEach(() => {
  mockSql.mockReset();
  mockSql.mockResolvedValue([mockPost]);
});

describe("getSearchedPosts author matching", () => {
  it("matches the author's name as well as post content on the public feed", async () => {
    await getSearchedPosts("vanna", undefined, 1);

    expect(allSql()).toContain("u.username ILIKE");
    expect(allValues()).toContain("%vanna%");
  });

  it("still matches post content on the public feed", async () => {
    await getSearchedPosts("vanna", undefined, 1);

    expect(allSql()).toContain("p.search_vector @@ plainto_tsquery('english',");
  });

  it("searches content only on the dashboard, where every post is already the viewer's", async () => {
    await getSearchedPosts("vanna", "user-1", 1);

    expect(allSql()).not.toContain("u.username ILIKE");
    expect(allSql()).toContain("p.search_vector @@ plainto_tsquery('english',");
  });

  it("escapes LIKE wildcards the user typed so they match literally", async () => {
    await getSearchedPosts("100%_raw", undefined, 1);

    expect(allValues()).toContain("%100\\%\\_raw%");
  });

  it("returns the rows the query produced", async () => {
    const posts = await getSearchedPosts("vanna", undefined, 1);

    expect(posts).toEqual([mockPost]);
  });
});

describe("getSearchedPostsCount author matching", () => {
  beforeEach(() => {
    mockSql.mockResolvedValue([{ count: "3" }]);
  });

  it("joins USERS so author matches are counted, keeping pagination in step", async () => {
    const count = await getSearchedPostsCount("vanna");

    expect(count).toBe("3");
    expect(allSql()).toContain('INNER JOIN "USERS"');
    expect(allSql()).toContain("u.username ILIKE");
  });

  it("counts content matches only when scoped to an author", async () => {
    const count = await getSearchedPostsCount("vanna", "user-1");

    expect(count).toBe("3");
    expect(allSql()).not.toContain("u.username ILIKE");
  });
});
