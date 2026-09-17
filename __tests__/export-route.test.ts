/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

jest.mock("@/lib/auth/server", () => ({
  auth: { getSession: jest.fn() },
}));

jest.mock("@/lib/posts/queries", () => ({
  getUserPostsForExport: jest.fn(),
}));

import { GET } from "@/app/api/export/route";
import { auth } from "@/lib/auth/server";
import { getUserPostsForExport } from "@/lib/posts/queries";

const mockGetSession = auth.getSession as jest.Mock;
const mockGetPosts = getUserPostsForExport as jest.Mock;

const USER = { id: "user-1", name: "Vann", email: "vann@example.com" };

const privatePost = {
  id: 7,
  post_name: "A quiet morning",
  post_description: null,
  post_date: new Date("2025-06-01T00:00:00Z"),
  post_edit_date: null,
  access: 2,
  post_body_json: {
    type: "doc",
    content: [{ type: "image", attrs: { src: "/api/file?pathname=posts/user-1/lake.jpg" } }],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { user: USER } });
  mockGetPosts.mockResolvedValue([privatePost]);
});

describe("/api/export", () => {
  it("refuses a signed-out request without reading any posts", async () => {
    mockGetSession.mockResolvedValueOnce({ data: null });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockGetPosts).not.toHaveBeenCalled();
  });

  it("exports only the signed-in author's posts", async () => {
    await GET();
    expect(mockGetPosts).toHaveBeenCalledWith("user-1");
  });

  it("downloads as an attachment that no shared cache keeps", async () => {
    const res = await GET();

    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="recollections-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("keeps the body, the calendar date, a readable access level and image paths", async () => {
    const data = await (await GET()).json();

    expect(data.author).toEqual({ name: "Vann", email: "vann@example.com" });
    expect(data.posts).toEqual([
      {
        id: 7,
        title: "A quiet morning",
        description: "",
        date: "2025-06-01",
        editedDate: null,
        access: "private",
        images: ["posts/user-1/lake.jpg"],
        body: privatePost.post_body_json,
      },
    ]);
  });
});
