// Mock next/navigation and next/cache before imports
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/posts/queries", () => ({
  createPost: jest.fn(),
  editPost: jest.fn(),
  deletePostById: jest.fn(),
}));

import { createPostHandler, editPostHandler, deletePostAction } from "@/lib/posts/actions";
import { createPost, editPost, deletePostById } from "@/lib/posts/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const mockCreatePost = createPost as jest.MockedFunction<typeof createPost>;
const mockEditPost = editPost as jest.MockedFunction<typeof editPost>;
const mockDeletePostById = deletePostById as jest.MockedFunction<typeof deletePostById>;
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
  it("should call createPost with correct data and redirect to /posts", async () => {
    mockCreatePost.mockResolvedValueOnce("Post created successfully");

    const formData = makeFormData({
      title: "My New Post",
      body: "Some body content",
    });

    await createPostHandler(formData);

    expect(mockCreatePost).toHaveBeenCalledTimes(1);
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        post_name: "My New Post",
        post_body: "Some body content",
        post_author: "John Doe",
        post_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    );
    expect(mockRedirect).toHaveBeenCalledWith("/posts");
  });

  it("should format post_date as YYYY-MM-DD", async () => {
    mockCreatePost.mockResolvedValueOnce("Post created successfully");

    const formData = makeFormData({ title: "Date Test", body: "body" });
    await createPostHandler(formData);

    const callArg = mockCreatePost.mock.calls[0][0];
    expect(callArg.post_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("editPostHandler", () => {
  it("should call editPost with correct data and redirect to the post page", async () => {
    mockEditPost.mockResolvedValueOnce("Post edited successfully");

    const formData = makeFormData({
      id: "42",
      title: "Updated Title",
      body: "Updated body",
    });

    await editPostHandler(formData);

    expect(mockEditPost).toHaveBeenCalledTimes(1);
    expect(mockEditPost).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        post_name: "Updated Title",
        post_body: "Updated body",
        post_edit_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    );
    expect(mockRedirect).toHaveBeenCalledWith("/posts/42");
  });
});

describe("deletePostAction", () => {
  it("should call deletePostById and revalidate /posts", async () => {
    mockDeletePostById.mockResolvedValueOnce({ id: 5 } as any);

    const formData = makeFormData({ id: "5" });
    await deletePostAction(formData);

    expect(mockDeletePostById).toHaveBeenCalledWith(5);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts");
  });

  it("should throw an error if id is invalid", async () => {
    const formData = makeFormData({ id: "not-a-number" });

    await expect(deletePostAction(formData)).rejects.toThrow("Invalid id");
    expect(mockDeletePostById).not.toHaveBeenCalled();
  });
});
