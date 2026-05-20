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

import { createPostHandler, editPostHandler, deletePostAction } from "@/lib/posts/actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

const mockSql = sql as jest.MockedFunction<any>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

// Helper to create a FormData mock
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
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
});

describe("editPostHandler", () => {
  it("should redirect to the post page after editing", async () => {
    mockSql.mockResolvedValueOnce([]);

    await editPostHandler({
      id: 42,
      title: "Updated Title",
      body: "Updated body",
      access: 1,
    });

    expect(mockRedirect).toHaveBeenCalledWith("/posts/42");
  });
});

describe("deletePostAction", () => {
  it("should call deletePostById and revalidate /posts", async () => {
    mockSql.mockResolvedValueOnce([{ id: 5 }]);

    const formData = makeFormData({ id: "5" });
    await deletePostAction(formData);

    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts");
  });

  it("should throw an error if id is invalid", async () => {
    const formData = makeFormData({ id: "not-a-number" });

    await expect(deletePostAction(formData)).rejects.toThrow("Invalid id");
  });
});
