// Mock next/navigation and next/cache before imports
jest.mock("next/navigation", () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    // Next.js redirect() throws internally; mirror that so control flow stops.
    throw Object.assign(new Error(url), { digest: "NEXT_REDIRECT" });
  }),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock the db module used by actions to avoid loading the real Neon client
jest.mock("@/lib/db", () => ({
  sql: jest.fn(),
}));

jest.mock("@/lib/auth/server", () => ({
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
    }),
  },
}));

const mockGetPostById = jest.fn();
jest.mock("@/lib/posts/queries", () => ({
  getPostById: (...args: unknown[]) => mockGetPostById(...args),
}));

import { createPostHandler, editPostHandler, deletePostAction } from "@/lib/posts/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

const mockSql = sql as jest.MockedFunction<any>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPostById.mockResolvedValue({
    id: 42,
    post_name: "Test Post",
    post_author: "user-123",
    post_body: "Body",
    post_date: "2024-01-01",
    username: "testuser",
  });
});

// Helper: run an action that will redirect (throws in test env); catch redirect throws.
async function runAction(fn: () => Promise<unknown>) {
  try { await fn(); } catch (e: any) { if (e?.digest !== "NEXT_REDIRECT") throw e; }
}

describe("createPostHandler", () => {
  it("should redirect to /posts after creating a post", async () => {
    mockSql.mockResolvedValueOnce([]);
    await runAction(() => createPostHandler({ title: "My New Post", body: "Some body content" }));
    expect(mockRedirect).toHaveBeenCalledWith("/posts");
  });
});

describe("editPostHandler", () => {
  it("should redirect to the post page after editing", async () => {
    mockSql.mockResolvedValueOnce([]);
    const formData = makeFormData({ id: "42", title: "Updated Title", body: "Updated body" });
    await runAction(() => editPostHandler(formData));
    expect(mockRedirect).toHaveBeenCalledWith("/posts/42");
  });

  it("should redirect to /posts when post is not found", async () => {
    mockGetPostById.mockResolvedValueOnce(undefined);
    const formData = makeFormData({ id: "99", title: "T", body: "B" });
    await runAction(() => editPostHandler(formData));
    expect(mockRedirect).toHaveBeenCalledWith("/posts");
  });

  it("should redirect to post page when user is not the author", async () => {
    mockGetPostById.mockResolvedValueOnce({
      id: 42, post_author: "other-user", post_name: "Test", post_body: "", post_date: "2024-01-01", username: "other",
    });
    const formData = makeFormData({ id: "42", title: "T", body: "B" });
    await runAction(() => editPostHandler(formData));
    expect(mockRedirect).toHaveBeenCalledWith("/posts/42");
  });
});

describe("deletePostAction", () => {
  it("should revalidate /posts and redirect after deleting", async () => {
    mockSql.mockResolvedValueOnce([{ id: 5 }]);
    mockGetPostById.mockResolvedValueOnce({
      id: 5, post_author: "user-123", post_name: "Test", post_body: "", post_date: "2024-01-01", username: "u",
    });
    const formData = makeFormData({ id: "5" });
    await runAction(() => deletePostAction(formData));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts");
    expect(mockRedirect).toHaveBeenCalledWith("/posts");
  });

  it("should redirect to /posts without deleting when user is not the author", async () => {
    mockGetPostById.mockResolvedValueOnce({
      id: 5, post_author: "other-user", post_name: "Test", post_body: "", post_date: "2024-01-01", username: "u",
    });
    const formData = makeFormData({ id: "5" });
    await runAction(() => deletePostAction(formData));
    expect(mockRedirect).toHaveBeenCalledWith("/posts");
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("should throw an error if id is invalid", async () => {
    const formData = makeFormData({ id: "not-a-number" });
    await expect(deletePostAction(formData)).rejects.toThrow("Invalid id");
  });
});
