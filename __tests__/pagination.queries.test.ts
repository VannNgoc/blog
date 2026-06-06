import { getPosts, getPostsCount, getUserPosts, getUserPostsCount } from "@/lib/posts/queries";

jest.mock("@/lib/db", () => ({ sql: jest.fn() }));
jest.mock("server-only", () => ({}));

import { sql } from "@/lib/db";

const mockSql = sql as jest.MockedFunction<any>;

const mockPost = {
  id: 1,
  post_name: "Test Post",
  post_author: "user-1",
  post_date: "2024-01-01",
  post_edit_date: null,
  post_body: "Body text",
  access: 1,
  username: "testuser",
};

beforeEach(() => {
  mockSql.mockReset();
});

describe("getPostsCount", () => {
  it("returns count of public posts only when isPublic is true", async () => {
    mockSql.mockResolvedValueOnce([{ count: "5" }]);
    const count = await getPostsCount({ isPublic: true });
    expect(count).toBe("5");
  });

  it("returns total count of all posts when isPublic is false", async () => {
    mockSql.mockResolvedValueOnce([{ count: "12" }]);
    const count = await getPostsCount({ isPublic: false });
    expect(count).toBe("12");
  });

  it("returns 0 when no posts exist", async () => {
    mockSql.mockResolvedValueOnce([{ count: "0" }]);
    const count = await getPostsCount({ isPublic: true });
    expect(count).toBe("0");
  });
});

describe("getPosts pagination", () => {
  it("returns posts for page 1", async () => {
    mockSql.mockResolvedValueOnce([mockPost]);
    const posts = await getPosts(undefined, 1);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ id: 1, post_name: "Test Post" });
  });

  it("returns posts for page 2", async () => {
    const page2Post = { ...mockPost, id: 11, post_name: "Page 2 Post" };
    mockSql.mockResolvedValueOnce([page2Post]);
    const posts = await getPosts(undefined, 2);
    expect(posts[0]).toMatchObject({ id: 11, post_name: "Page 2 Post" });
  });

  it("returns empty array when page has no posts", async () => {
    mockSql.mockResolvedValueOnce([]);
    const posts = await getPosts(undefined, 99);
    expect(posts).toEqual([]);
  });

  it("returns multiple posts on a page", async () => {
    const multiplePosts = Array.from({ length: 10 }, (_, i) => ({
      ...mockPost,
      id: i + 1,
      post_name: `Post ${i + 1}`,
    }));
    mockSql.mockResolvedValueOnce(multiplePosts);
    const posts = await getPosts(undefined, 1);
    expect(posts).toHaveLength(10);
  });
});

describe("getUserPostsCount", () => {
  it("returns count of posts visible to the user", async () => {
    mockSql.mockResolvedValueOnce([{ count: "8" }]);
    const count = await getUserPostsCount("user-1");
    expect(count).toBe("8");
  });

  it("returns 0 when user has no posts and no public posts exist", async () => {
    mockSql.mockResolvedValueOnce([{ count: "0" }]);
    const count = await getUserPostsCount("user-1");
    expect(count).toBe("0");
  });
});

describe("getUserPosts pagination", () => {
  it("returns public posts and the user's own private posts", async () => {
    const privatePost = { ...mockPost, id: 2, access: 0, post_author: "user-1" };
    mockSql.mockResolvedValueOnce([mockPost, privatePost]);
    const posts = await getUserPosts("user-1", 1);
    expect(posts).toHaveLength(2);
  });

  it("returns posts for page 1", async () => {
    mockSql.mockResolvedValueOnce([mockPost]);
    const posts = await getUserPosts("user-1", 1);
    expect(posts[0]).toMatchObject({ id: 1 });
  });

  it("returns posts for page 2", async () => {
    const page2Post = { ...mockPost, id: 11 };
    mockSql.mockResolvedValueOnce([page2Post]);
    const posts = await getUserPosts("user-1", 2);
    expect(posts[0]).toMatchObject({ id: 11 });
  });

  it("returns empty array when page has no posts", async () => {
    mockSql.mockResolvedValueOnce([]);
    const posts = await getUserPosts("user-1", 99);
    expect(posts).toEqual([]);
  });
});
