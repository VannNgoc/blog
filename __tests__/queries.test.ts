import { getPosts, getPostById, getAdjacentPosts } from "@/lib/posts/queries";

// Mock the db module
jest.mock("@/lib/db", () => ({
  sql: jest.fn(),
}));

// Mock server-only
jest.mock("server-only", () => ({}));

import { sql } from "@/lib/db";

const mockSql = sql as jest.MockedFunction<any>;

const mockPost = {
  id: 1,
  post_name: "Test Post",
  post_date: "2024-01-01",
  post_body: "This is a test post body.",
  post_tags: null,
};

beforeEach(() => {
  mockSql.mockReset();
});

describe("getPosts", () => {
  it("should return a list of posts ordered by date", async () => {
    mockSql.mockResolvedValueOnce([mockPost]);

    const posts = await getPosts();

    expect(Array.isArray(posts)).toBe(true);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: 1,
      post_name: "Test Post",
    });
  });

  it("should return an empty array when no posts exist", async () => {
    mockSql.mockResolvedValueOnce([]);

    const posts = await getPosts();

    expect(posts).toEqual([]);
  });
});

describe("getPostById", () => {
  it("should return a single post by id", async () => {
    mockSql.mockResolvedValueOnce([mockPost]);

    const post = await getPostById(1);

    expect(post).toMatchObject({ id: 1, post_name: "Test Post" });
  });

  it("should return undefined when post does not exist", async () => {
    mockSql.mockResolvedValueOnce([]);

    const post = await getPostById(999);

    expect(post).toBeUndefined();
  });
});

describe("getAdjacentPosts", () => {
  describe("unauthenticated (no user_id)", () => {
    it("should return both newer and older posts when both exist", async () => {
      const currentDate = new Date("2024-01-02");
      const newerPost = { ...mockPost, id: 2, post_date: "2024-01-03", post_name: "Newer Post" };
      const olderPost = { ...mockPost, id: 3, post_date: "2024-01-01", post_name: "Older Post" };

      mockSql.mockResolvedValueOnce([newerPost]).mockResolvedValueOnce([olderPost]);

      const adjacent = await getAdjacentPosts({ id: 1, post_date: currentDate });

      expect(mockSql).toHaveBeenCalledTimes(2);
      expect(adjacent).toEqual({ newer: newerPost, older: olderPost });
    });

    it("should return undefined newer when current post is the newest", async () => {
      const currentDate = new Date("2024-01-03");
      const olderPost = { ...mockPost, id: 3, post_date: "2024-01-02", post_name: "Older Post" };

      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([olderPost]);

      const adjacent = await getAdjacentPosts({ id: 2, post_date: currentDate });

      expect(adjacent.newer).toBeUndefined();
      expect(adjacent.older).toEqual(olderPost);
    });

    it("should return undefined older when current post is the oldest", async () => {
      const currentDate = new Date("2024-01-01");
      const newerPost = { ...mockPost, id: 2, post_date: "2024-01-02", post_name: "Newer Post" };

      mockSql.mockResolvedValueOnce([newerPost]).mockResolvedValueOnce([]);

      const adjacent = await getAdjacentPosts({ id: 3, post_date: currentDate });

      expect(adjacent.newer).toEqual(newerPost);
      expect(adjacent.older).toBeUndefined();
    });
  });

  describe("authenticated (with user_id)", () => {
    it("should return adjacent posts including the user's own private posts", async () => {
      const currentDate = new Date("2024-01-02");
      const newerPost = { ...mockPost, id: 2, post_date: "2024-01-03", post_name: "Newer Post" };
      const olderPost = { ...mockPost, id: 3, post_date: "2024-01-01", post_name: "Older Post" };

      mockSql.mockResolvedValueOnce([newerPost]).mockResolvedValueOnce([olderPost]);

      const adjacent = await getAdjacentPosts({ id: 1, post_date: currentDate, user_id: "42" });

      expect(mockSql).toHaveBeenCalledTimes(2);
      expect(adjacent).toEqual({ newer: newerPost, older: olderPost });
    });

    it("should return undefined newer when no newer accessible post exists", async () => {
      const currentDate = new Date("2024-01-03");
      const olderPost = { ...mockPost, id: 3, post_date: "2024-01-02", post_name: "Older Post" };

      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([olderPost]);

      const adjacent = await getAdjacentPosts({ id: 2, post_date: currentDate, user_id: "42" });

      expect(adjacent.newer).toBeUndefined();
      expect(adjacent.older).toEqual(olderPost);
    });

    it("should return undefined for both when no accessible adjacent posts exist", async () => {
      const currentDate = new Date("2024-01-01");

      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const adjacent = await getAdjacentPosts({ id: 1, post_date: currentDate, user_id: "42" });

      expect(adjacent.newer).toBeUndefined();
      expect(adjacent.older).toBeUndefined();
    });
  });
});
