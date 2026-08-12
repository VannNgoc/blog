jest.mock("@/lib/posts/queries", () => ({
  getPosts: jest.fn(),
  getPostsCount: jest.fn(),
}));

import sitemap from "@/app/sitemap";
import { getPosts, getPostsCount } from "@/lib/posts/queries";

const mockGetPosts = getPosts as jest.Mock;
const mockGetPostsCount = getPostsCount as jest.Mock;

function mockPost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    post_name: "A Post",
    post_date: new Date("2024-01-01"),
    post_edit_date: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockGetPosts.mockReset();
  mockGetPostsCount.mockReset();
});

describe("sitemap", () => {
  it("always includes the homepage and posts index with the expected priorities", async () => {
    mockGetPostsCount.mockResolvedValue(0);
    mockGetPosts.mockResolvedValue([]);

    const entries = await sitemap();

    expect(entries[0]).toMatchObject({ url: "http://localhost:3000", priority: 1 });
    expect(entries[1]).toMatchObject({ url: "http://localhost:3000/posts", priority: 0.8 });
  });

  it("includes one entry per public post", async () => {
    mockGetPostsCount.mockResolvedValue(2);
    mockGetPosts.mockResolvedValue([
      mockPost({ id: 10 }),
      mockPost({ id: 11 }),
    ]);

    const entries = await sitemap();
    const postUrls = entries.filter((e) => e.url.includes("/posts/")).map((e) => e.url);

    expect(postUrls).toEqual([
      "http://localhost:3000/posts/10",
      "http://localhost:3000/posts/11",
    ]);
  });

  it("requests only public posts, not the full/private-inclusive listing", async () => {
    mockGetPostsCount.mockResolvedValue(1);
    mockGetPosts.mockResolvedValue([mockPost()]);

    await sitemap();

    expect(mockGetPostsCount).toHaveBeenCalledWith({ isPublic: true });
  });

  it("uses the last edit date when present, falling back to the original post date", async () => {
    mockGetPostsCount.mockResolvedValue(2);
    mockGetPosts.mockResolvedValue([
      mockPost({ id: 1, post_date: new Date("2024-01-01"), post_edit_date: new Date("2024-06-01") }),
      mockPost({ id: 2, post_date: new Date("2024-02-01"), post_edit_date: null }),
    ]);

    const entries = await sitemap();
    const byId = (id: number) => entries.find((e) => e.url.endsWith(`/posts/${id}`));

    expect(byId(1)?.lastModified).toEqual(new Date("2024-06-01"));
    expect(byId(2)?.lastModified).toEqual(new Date("2024-02-01"));
  });

  it("fans out across every page of posts, not just the first", async () => {
    // 15 public posts at PAGINATION_LIMIT=10 spans 2 pages.
    mockGetPostsCount.mockResolvedValue(15);
    mockGetPosts.mockImplementation((_userId: string | undefined, page: number) =>
      Promise.resolve(
        page === 1
          ? Array.from({ length: 10 }, (_, i) => mockPost({ id: i + 1 }))
          : Array.from({ length: 5 }, (_, i) => mockPost({ id: 10 + i + 1 }))
      )
    );

    const entries = await sitemap();
    const postUrls = entries.filter((e) => e.url.includes("/posts/"));

    expect(mockGetPosts).toHaveBeenCalledTimes(2);
    expect(mockGetPosts).toHaveBeenCalledWith(undefined, 1);
    expect(mockGetPosts).toHaveBeenCalledWith(undefined, 2);
    expect(postUrls).toHaveLength(15);
  });

  it("still requests one page when there are zero posts", async () => {
    mockGetPostsCount.mockResolvedValue(0);
    mockGetPosts.mockResolvedValue([]);

    const entries = await sitemap();

    expect(mockGetPosts).toHaveBeenCalledTimes(1);
    expect(entries.filter((e) => e.url.includes("/posts/"))).toHaveLength(0);
  });
});
