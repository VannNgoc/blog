// Mock next/navigation and next/cache before imports
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  updateTag: jest.fn(),
  // lib/posts/cached.ts wraps queries in unstable_cache at module scope, and
  // actions.ts imports that module for its tag constants — a passthrough
  // avoids pulling in Next's real Data Cache (which needs a live request
  // context this test never has) just to load those constants.
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
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

// Mock @vercel/blob to avoid loading its ESM-only @vercel/oidc dependency in Jest
jest.mock("@vercel/blob", () => ({
  del: jest.fn(),
}));

import {
  createPostHandler,
  editPostHandler,
  deletePostAction,
  restorePostAction,
  deletePostForeverAction,
} from "@/lib/posts/actions";
import { del } from "@vercel/blob";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { sql } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { PUBLIC_POSTS_TAG, postTag } from "@/lib/posts/cached";

const mockSql = sql as unknown as jest.Mock;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockUpdateTag = updateTag as jest.MockedFunction<typeof updateTag>;
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

const sampleDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Some body content" }] }],
};

describe("createPostHandler", () => {
  it("should redirect to /posts after creating a post", async () => {
    mockSql.mockResolvedValueOnce([]);

    await createPostHandler({
      json: JSON.stringify(sampleDoc),
      title: "My New Post",
      description: "",
      access: 1,
    });

    expect(mockRedirect).toHaveBeenCalledWith("/posts");
  });

  it("invalidates the public posts cache", async () => {
    mockSql.mockResolvedValueOnce([]);

    await createPostHandler({
      json: JSON.stringify(sampleDoc),
      title: "My New Post",
      description: "",
      access: 1,
    });

    expect(mockUpdateTag).toHaveBeenCalledWith(PUBLIC_POSTS_TAG);
  });

  /** Returned rather than thrown: Next.js hides a thrown action error's message
      in production, so the editor could never tell the writer why it failed. */
  it("returns an error, without writing, if the user is signed out", async () => {
    (mockAuth.getSession as jest.Mock).mockResolvedValueOnce({ data: null });

    const result = await createPostHandler({
      json: JSON.stringify(sampleDoc),
      title: "My New Post",
      description: "",
      access: 1,
    });

    expect(result).toEqual({ error: expect.stringMatching(/signed out/i) });
    expect(mockSql).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns the validation message, without writing, when the title is empty", async () => {
    const result = await createPostHandler({
      json: JSON.stringify(sampleDoc),
      title: "",
      description: "",
      access: 1,
    });

    expect(result).toEqual({ error: "Please enter a title." });
    expect(mockSql).not.toHaveBeenCalled();
  });

  /** Save in place (Ctrl/Cmd+S) needs the new id back, so the editor's next
      save edits this post instead of inserting a duplicate. */
  it("returns the new post's id instead of redirecting when asked to stay", async () => {
    mockSql.mockResolvedValueOnce([{ id: 77 }]);

    const result = await createPostHandler({
      json: JSON.stringify(sampleDoc),
      title: "My New Post",
      description: "",
      access: 1,
      stay: true,
    });

    expect(result).toEqual({ id: 77 });
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts");
  });

  /** Vercel runs in UTC; 9:30pm in New York is already tomorrow there. */
  it("dates the post by the site's time zone, not the server clock", async () => {
    jest.useFakeTimers({ now: new Date("2026-03-10T01:30:00Z") }); // 9:30pm Mar 9 in New York
    try {
      mockSql.mockResolvedValueOnce([{ id: 1 }]);

      await createPostHandler({
        json: JSON.stringify(sampleDoc),
        title: "Evening entry",
        description: "",
        access: 1,
        stay: true,
      });

      // Tagged template: the interpolated values follow the strings array.
      const values = mockSql.mock.calls[0].slice(1);
      expect(values).toContain("2026-03-09");
      expect(values).not.toContain("2026-03-10");
    } finally {
      jest.useRealTimers();
    }
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
      json: JSON.stringify(sampleDoc),
      title: "Updated Title",
      description: "",
      access: 1,
    });

    expect(mockRedirect).toHaveBeenCalledWith("/posts/42");
  });

  it("invalidates the public posts cache and this post's own entry", async () => {
    mockSql
      .mockResolvedValueOnce([mockPost])
      .mockResolvedValueOnce([]);

    await editPostHandler({
      id: 42,
      json: JSON.stringify(sampleDoc),
      title: "Updated Title",
      description: "",
      access: 1,
    });

    expect(mockUpdateTag).toHaveBeenCalledWith(PUBLIC_POSTS_TAG);
    expect(mockUpdateTag).toHaveBeenCalledWith(postTag(42));
  });

  it("returns an error if the user is signed out", async () => {
    (mockAuth.getSession as jest.Mock).mockResolvedValueOnce({ data: null });

    const result = await editPostHandler({
      id: 42,
      json: JSON.stringify(sampleDoc),
      title: "Updated Title",
      description: "",
      access: 1,
    });

    expect(result).toEqual({ error: expect.stringMatching(/signed out/i) });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("returns an error if the post does not exist", async () => {
    mockSql.mockResolvedValueOnce([]); // getPostById returns nothing

    const result = await editPostHandler({
      id: 999,
      json: JSON.stringify(sampleDoc),
      title: "Updated Title",
      description: "",
      access: 1,
    });

    expect(result).toEqual({ error: "This post no longer exists." });
    expect(mockSql).toHaveBeenCalledTimes(1); // the lookup, and no UPDATE
  });

  it("returns an error, without updating, if the user is not the author", async () => {
    mockSql.mockResolvedValueOnce([{ ...mockPost, post_author: "other-user" }]);

    const result = await editPostHandler({
      id: 42,
      json: JSON.stringify(sampleDoc),
      title: "Updated Title",
      description: "",
      access: 1,
    });

    expect(result).toEqual({ error: "You can only edit your own posts." });
    expect(mockSql).toHaveBeenCalledTimes(1); // the lookup, and no UPDATE
  });

  it("returns the post's id instead of redirecting when asked to stay", async () => {
    mockSql.mockResolvedValueOnce([mockPost]).mockResolvedValueOnce([]);

    const result = await editPostHandler({
      id: 42,
      json: JSON.stringify(sampleDoc),
      title: "Updated Title",
      description: "",
      access: 1,
      stay: true,
    });

    expect(result).toEqual({ id: 42 });
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts/42");
  });
});

/** The SQL text of the nth call to the sql tag, with values shown as `?`. */
function sqlText(n: number) {
  return (mockSql.mock.calls[n][0] as TemplateStringsArray).join("?");
}

describe("deletePostAction", () => {
  it("moves the post to the trash and revalidates /posts", async () => {
    // First sql call: getPostById; second: the trash UPDATE
    mockSql
      .mockResolvedValueOnce([mockPost])
      .mockResolvedValueOnce([]);

    const formData = makeFormData({ id: "42" });
    await deletePostAction(formData);

    expect(sqlText(1)).toMatch(/UPDATE "POSTS" SET deleted_at = now\(\)/);
    expect(sqlText(1)).not.toMatch(/DELETE/);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/trash");
    expect(mockUpdateTag).toHaveBeenCalledWith(PUBLIC_POSTS_TAG);
    expect(mockUpdateTag).toHaveBeenCalledWith(postTag(42));
  });

  /** A trashed post must still be restorable with its images intact. */
  it("leaves the post's images in storage", async () => {
    const withImage = {
      ...mockPost,
      post_body_json: {
        type: "doc",
        content: [{ type: "image", attrs: { src: "/api/file?pathname=posts/user-1/a.jpg" } }],
      },
    };
    mockSql.mockResolvedValueOnce([withImage]).mockResolvedValueOnce([]);

    await deletePostAction(makeFormData({ id: "42" }));

    expect(del).not.toHaveBeenCalled();
  });

  /** Deleting from a list leaves you on that list, so no destination is given
      and none should be invented. */
  it("stays put when no destination is given", async () => {
    mockSql.mockResolvedValueOnce([mockPost]).mockResolvedValueOnce([{ id: 5 }]);

    await deletePostAction(makeFormData({ id: "42" }));

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  /** Deleting from the post's own page destroys the route you're standing on,
      so that caller passes somewhere to land. */
  it("redirects when the caller supplies a destination", async () => {
    mockSql.mockResolvedValueOnce([mockPost]).mockResolvedValueOnce([{ id: 5 }]);

    await deletePostAction(makeFormData({ id: "42", redirectTo: "/dashboard" }));

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  /** `redirectTo` arrives from a form field, so it goes through the same
      open-redirect guard as every other redirect in this file. */
  it("refuses to be sent off-site by a tampered destination", async () => {
    mockSql.mockResolvedValueOnce([mockPost]).mockResolvedValueOnce([{ id: 5 }]);

    await deletePostAction(makeFormData({ id: "42", redirectTo: "https://evil.example.com" }));

    expect(mockRedirect).toHaveBeenCalledWith("/posts");
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

const trashedPost = {
  id: 42,
  post_author: "user-1",
  deleted_at: new Date("2026-09-01"),
  post_body_json: {
    type: "doc",
    content: [{ type: "image", attrs: { src: "/api/file?pathname=posts/user-1/a.jpg" } }],
  },
};

describe("restorePostAction", () => {
  it("clears deleted_at on the author's trashed post", async () => {
    mockSql.mockResolvedValueOnce([trashedPost]).mockResolvedValueOnce([]);

    await restorePostAction(makeFormData({ id: "42" }));

    expect(sqlText(1)).toMatch(/SET deleted_at = NULL/);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts/42");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/trash");
    expect(mockUpdateTag).toHaveBeenCalledWith(PUBLIC_POSTS_TAG);
    expect(mockUpdateTag).toHaveBeenCalledWith(postTag(42));
  });

  it("refuses to restore someone else's post", async () => {
    mockSql.mockResolvedValueOnce([{ ...trashedPost, post_author: "other-user" }]);

    await expect(restorePostAction(makeFormData({ id: "42" }))).rejects.toThrow("Not authorised");
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("refuses when signed out", async () => {
    (mockAuth.getSession as jest.Mock).mockResolvedValueOnce({ data: null });

    await expect(restorePostAction(makeFormData({ id: "42" }))).rejects.toThrow("Not authenticated");
    expect(mockSql).not.toHaveBeenCalled();
  });
});

describe("deletePostForeverAction", () => {
  it("removes a trashed post and its images", async () => {
    mockSql.mockResolvedValueOnce([trashedPost]).mockResolvedValueOnce([trashedPost]);
    (del as jest.Mock).mockResolvedValueOnce(undefined);

    await deletePostForeverAction(makeFormData({ id: "42" }));

    expect(sqlText(1)).toMatch(/DELETE FROM "POSTS"/);
    expect(del).toHaveBeenCalledWith(["posts/user-1/a.jpg"]);
    expect(mockUpdateTag).toHaveBeenCalledWith(PUBLIC_POSTS_TAG);
    expect(mockUpdateTag).toHaveBeenCalledWith(postTag(42));
  });

  /** Permanent deletion is only ever the second step. A live post has to go
      through the trash first, so one mistaken click can't erase it. */
  it("refuses a post that isn't in the trash", async () => {
    mockSql.mockResolvedValueOnce([{ ...trashedPost, deleted_at: null }]);

    await expect(deletePostForeverAction(makeFormData({ id: "42" }))).rejects.toThrow(/in the trash/);
    expect(mockSql).toHaveBeenCalledTimes(1);
    expect(del).not.toHaveBeenCalled();
  });

  it("refuses someone else's post", async () => {
    mockSql.mockResolvedValueOnce([{ ...trashedPost, post_author: "other-user" }]);

    await expect(deletePostForeverAction(makeFormData({ id: "42" }))).rejects.toThrow("Not authorised");
    expect(del).not.toHaveBeenCalled();
  });
});
