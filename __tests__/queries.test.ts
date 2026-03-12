import {
  getPosts,
  getPostById,
  createPost,
  editPost,
  deletePostById,
} from "@/lib/posts/queries";

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

describe("createPost", () => {
  it("should insert a post and return success message", async () => {
    mockSql.mockResolvedValueOnce([]);

    const result = await createPost({
      post_name: "New Post",
      post_author: "John Doe",
      post_body: "Body content",
      post_date: "2024-01-01",
    });

    expect(result).toBe("Post created successfully");
  });
});

describe("editPost", () => {
  it("should update a post and return success message", async () => {
    mockSql.mockResolvedValueOnce([]);

    const result = await editPost({
      id: 1,
      post_name: "Updated Title",
      post_body: "Updated body",
      post_edit_date: "2024-06-01",
    });

    expect(result).toBe("Post edited successfully");
  });
});

describe("deletePostById", () => {
  it("should delete a post and return the deleted row", async () => {
    mockSql.mockResolvedValueOnce([mockPost]);

    const result = await deletePostById(1);

    expect(result).toMatchObject({ id: 1, post_name: "Test Post" });
  });

  it("should return null when post does not exist", async () => {
    mockSql.mockResolvedValueOnce([]);

    const result = await deletePostById(999);

    expect(result).toBeNull();
  });
});
