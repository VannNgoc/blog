// Mock next/navigation and next/cache before imports
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock the db module used by actions to avoid loading the real Neon client
jest.mock("@/lib/db", () => ({
  sql: jest.fn(),
}));

// Mock auth to avoid loading @neondatabase/auth ESM package in Jest
jest.mock("@/lib/auth/server", () => ({
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
    }),
  },
}));

jest.mock("server-only", () => ({}));

import { createPostHandler, editPostHandler, deletePostAction } from "@/lib/posts/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { auth } from "@/lib/auth/server";

const mockSql = sql as unknown as jest.Mock;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockAuth = auth as jest.Mocked<typeof auth>;

const mockPost = {
  id: 42,
  post_name: "Test Post",
  post_author: "user-1",
  post_date: new Date("2024-01-01"),
  post_edit_date: null,
  post_body: "Body text",
  access: 1,
  username: "testuser",
};

// Helper to create a FormData mock
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: authenticated as user-1
  (mockAuth.getSession as jest.Mock).mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
});

describe("createPostHandler", () => {
  it("should redirect to /posts after creating a post", async () => {
    mockSql.mockResolvedValueOnce([]);

    await createPostHandler({
      title: "My New Post",
      body: "Some body content",
      access: 1,
    });

    expect(mockRedirect).toHaveBeenCalledWith("/posts");
  });

  it("should return an error if user is not authenticated", async () => {
    (mockAuth.getSession as jest.Mock).mockResolvedValueOnce({ data: null });

    const result = await createPostHandler({
      title: "My New Post",
      body: "Some body content",
      access: 1,
    });

    expect(result).toBe("Error user is null");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe("editPostHandler", () => {
  it("should redirect to the post page after editing", async () => {
    // First sql call: getPostById; second: UPDATE
    mockSql
      .mockResolvedValueOnce([mockPost])
      .mockResolvedValueOnce([]);

    await editPostHandler({
      id: 42,
      title: "Updated Title",
      body: "Updated body",
      access: 1,
    });

    expect(mockRedirect).toHaveBeenCalledWith("/posts/42");
  });

  it("should throw if user is not authenticated", async () => {
    (mockAuth.getSession as jest.Mock).mockResolvedValueOnce({ data: null });

    await expect(editPostHandler({
      id: 42,
      title: "Updated Title",
      body: "Updated body",
      access: 1,
    })).rejects.toThrow("Not authenticated");
  });

  it("should throw if post does not exist", async () => {
    mockSql.mockResolvedValueOnce([]); // getPostById returns nothing

    await expect(editPostHandler({
      id: 999,
      title: "Updated Title",
      body: "Updated body",
      access: 1,
    })).rejects.toThrow("Post not found");
  });

  it("should throw if user is not the author", async () => {
    mockSql.mockResolvedValueOnce([{ ...mockPost, post_author: "other-user" }]);

    await expect(editPostHandler({
      id: 42,
      title: "Updated Title",
      body: "Updated body",
      access: 1,
    })).rejects.toThrow("Not authorised");
  });
});

describe("deletePostAction", () => {
  it("should call deletePostById and revalidate /posts", async () => {
    // First sql call: getPostById; second: DELETE
    mockSql
      .mockResolvedValueOnce([mockPost])
      .mockResolvedValueOnce([{ id: 5 }]);

    const formData = makeFormData({ id: "42" });
    await deletePostAction(formData);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts");
  });

  it("should throw an error if id is invalid", async () => {
    const formData = makeFormData({ id: "not-a-number" });

    await expect(deletePostAction(formData)).rejects.toThrow("Invalid id");
  });

  it("should throw if user is not authenticated", async () => {
    (mockAuth.getSession as jest.Mock).mockResolvedValueOnce({ data: null });

    const formData = makeFormData({ id: "42" });
    await expect(deletePostAction(formData)).rejects.toThrow("Not authenticated");
  });

  it("should throw if post does not exist", async () => {
    mockSql.mockResolvedValueOnce([]); // getPostById returns nothing

    const formData = makeFormData({ id: "999" });
    await expect(deletePostAction(formData)).rejects.toThrow("Post not found");
  });

  it("should throw if user is not the author", async () => {
    mockSql.mockResolvedValueOnce([{ ...mockPost, post_author: "other-user" }]);

    const formData = makeFormData({ id: "42" });
    await expect(deletePostAction(formData)).rejects.toThrow("Not authorised");
  });
});
