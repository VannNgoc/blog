jest.mock("server-only", () => ({}));

jest.mock("@/lib/posts/queries", () => ({
  getPostById: jest.fn(),
}));

import { getOwnPostForEditing } from "@/lib/posts/editing";
import { getPostById } from "@/lib/posts/queries";

const mockGetPostById = getPostById as jest.Mock;

const post = { id: 5, post_author: "user-1", post_name: "Mine" };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPostById.mockResolvedValue(post);
});

/** Both /posts/[id]/edit and /posts/create?id= open posts through this, so it
    is the one place the author check has to hold. */
describe("getOwnPostForEditing", () => {
  it("returns the post to its author", async () => {
    await expect(getOwnPostForEditing(5, "user-1")).resolves.toBe(post);
  });

  it("hides someone else's post", async () => {
    await expect(getOwnPostForEditing(5, "user-2")).resolves.toBeNull();
  });

  it("hides every post from a signed-out visitor without looking it up", async () => {
    await expect(getOwnPostForEditing(5, undefined)).resolves.toBeNull();
    expect(mockGetPostById).not.toHaveBeenCalled();
  });

  it("rejects an id that isn't a number, like /posts/create?id=abc", async () => {
    await expect(getOwnPostForEditing(Number("abc"), "user-1")).resolves.toBeNull();
    expect(mockGetPostById).not.toHaveBeenCalled();
  });

  it("returns null for a post that doesn't exist or is in the trash", async () => {
    mockGetPostById.mockResolvedValueOnce(undefined);
    await expect(getOwnPostForEditing(999, "user-1")).resolves.toBeNull();
  });
});
