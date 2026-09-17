/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

jest.mock("@vercel/blob", () => ({
  list: jest.fn(),
  del: jest.fn(),
}));

jest.mock("@/lib/posts/queries", () => ({
  getAllPostBodies: jest.fn(),
  deleteExpiredTrash: jest.fn(),
}));

import { GET } from "@/app/api/cron/cleanup-blobs/route";
import { list, del } from "@vercel/blob";
import { deleteExpiredTrash, getAllPostBodies } from "@/lib/posts/queries";
import { TRASH_RETENTION_DAYS } from "@/lib/constants";

const mockList = list as jest.Mock;
const mockDel = del as jest.Mock;
const mockGetAllPostBodies = getAllPostBodies as jest.Mock;
const mockDeleteExpiredTrash = deleteExpiredTrash as jest.Mock;

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/cleanup-blobs", { headers });
}

const referencedDoc = {
  type: "doc",
  content: [
    {
      type: "image",
      attrs: { src: "/api/file?pathname=posts/user-1/referenced.jpg" },
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  mockDeleteExpiredTrash.mockResolvedValue(0);
});

describe("GET /api/cron/cleanup-blobs", () => {
  it("rejects requests without the correct bearer token", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("rejects requests with the wrong bearer token", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("deletes only unreferenced blobs older than the grace period", async () => {
    mockGetAllPostBodies.mockResolvedValueOnce([{ post_body_json: referencedDoc }]);

    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recent = new Date();

    mockList.mockResolvedValueOnce({
      blobs: [
        { pathname: "posts/user-1/referenced.jpg", uploadedAt: old },
        { pathname: "posts/user-1/orphaned-old.jpg", uploadedAt: old },
        { pathname: "posts/user-1/orphaned-recent.jpg", uploadedAt: recent },
      ],
      hasMore: false,
    });

    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockDel).toHaveBeenCalledWith(["posts/user-1/orphaned-old.jpg"]);
    expect(body).toEqual({ purgedFromTrash: 0, scanned: 3, referenced: 1, deleted: 1 });
  });

  it("paginates through list() until hasMore is false", async () => {
    mockGetAllPostBodies.mockResolvedValueOnce([]);
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);

    mockList
      .mockResolvedValueOnce({
        blobs: [{ pathname: "posts/user-1/a.jpg", uploadedAt: old }],
        hasMore: true,
        cursor: "cursor-1",
      })
      .mockResolvedValueOnce({
        blobs: [{ pathname: "posts/user-1/b.jpg", uploadedAt: old }],
        hasMore: false,
      });

    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    const body = await res.json();

    expect(mockList).toHaveBeenCalledTimes(2);
    expect(mockList).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: "cursor-1" }));
    expect(body).toEqual({ purgedFromTrash: 0, scanned: 2, referenced: 0, deleted: 2 });
  });

  /** Order matters: the sweep only treats a purged post's images as orphans if
      the purge has already removed the row by the time bodies are read. */
  it("empties expired trash before reading post bodies for the sweep", async () => {
    const order: string[] = [];
    mockDeleteExpiredTrash.mockImplementationOnce(async () => {
      order.push("purge");
      return 2;
    });
    mockGetAllPostBodies.mockImplementationOnce(async () => {
      order.push("bodies");
      return [];
    });
    mockList.mockResolvedValueOnce({ blobs: [], hasMore: false });

    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    const body = await res.json();

    expect(mockDeleteExpiredTrash).toHaveBeenCalledWith(TRASH_RETENTION_DAYS);
    expect(order).toEqual(["purge", "bodies"]);
    expect(body.purgedFromTrash).toBe(2);
  });

  it("does not purge the trash for an unauthorized caller", async () => {
    await GET(makeRequest({ authorization: "Bearer wrong" }));
    expect(mockDeleteExpiredTrash).not.toHaveBeenCalled();
  });
});

