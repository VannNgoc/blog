/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

jest.mock("@vercel/blob", () => ({
  get: jest.fn(),
}));

jest.mock("@/lib/posts/queries", () => ({
  getPostById: jest.fn(),
}));

jest.mock("@/lib/auth/server", () => ({
  auth: { getSession: jest.fn() },
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/file/route";
import { get } from "@vercel/blob";
import { getPostById } from "@/lib/posts/queries";
import { auth } from "@/lib/auth/server";
import { ACCESS_PUBLIC, ACCESS_PRIVATE, ACCESS_DRAFT } from "@/lib/constants";

const mockGet = get as jest.Mock;
const mockGetPostById = getPostById as jest.Mock;
const mockGetSession = auth.getSession as jest.Mock;

const AUTHOR = "author-uuid";
const OTHER = "someone-else";
const PATHNAME = `posts/${AUTHOR}/abc-photo.jpg`;

/** A stored body that genuinely embeds PATHNAME, as the real access check requires. */
function bodyReferencing(pathname: string) {
  return {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { src: `/api/file?pathname=${encodeURIComponent(pathname)}` },
      },
    ],
  };
}

function post(access: number, extra: Record<string, unknown> = {}) {
  return {
    id: 7,
    access,
    post_author: AUTHOR,
    post_body_json: bodyReferencing(PATHNAME),
    ...extra,
  };
}

function request({ pathname = PATHNAME, postId }: { pathname?: string; postId?: number | string } = {}) {
  const url = new URL("http://localhost/api/file");
  if (pathname) url.searchParams.set("pathname", pathname);
  if (postId !== undefined) url.searchParams.set("postId", String(postId));
  return new NextRequest(url);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({
    statusCode: 200,
    stream: "binary",
    blob: { contentType: "image/jpeg" },
  });
  mockGetSession.mockResolvedValue({ data: null });
});

describe("/api/file access control", () => {
  it("serves an image embedded in a public post to an anonymous requester", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PUBLIC));

    const res = await GET(request({ postId: 7 }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  /** The reason the session call moved below the post lookup: on the public
      path the answer cannot depend on who is asking, and every image on a page
      is a separate request paying that round trip. */
  it("never calls getSession for a public post's image", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PUBLIC));

    await GET(request({ postId: 7 }));

    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("marks a public post's image cacheable by shared caches", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PUBLIC));

    const res = await GET(request({ postId: 7 }));

    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
  });

  it("serves a private post's image to its author", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PRIVATE));
    mockGetSession.mockResolvedValue({ data: { user: { id: AUTHOR } } });

    const res = await GET(request({ postId: 7 }));

    expect(res.status).toBe(200);
  });

  it("keeps a private post's image out of shared caches", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PRIVATE));
    mockGetSession.mockResolvedValue({ data: { user: { id: AUTHOR } } });

    const res = await GET(request({ postId: 7 }));

    expect(res.headers.get("Cache-Control")).toContain("private");
    expect(res.headers.get("Cache-Control")).not.toContain("s-maxage");
  });

  it("refuses a private post's image to a different signed-in user", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PRIVATE));
    mockGetSession.mockResolvedValue({ data: { user: { id: OTHER } } });

    const res = await GET(request({ postId: 7 }));

    expect(res.status).toBe(404);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("refuses a private post's image to an anonymous requester", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PRIVATE));

    const res = await GET(request({ postId: 7 }));

    expect(res.status).toBe(404);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("refuses a draft's image to a non-author", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_DRAFT));
    mockGetSession.mockResolvedValue({ data: { user: { id: OTHER } } });

    expect((await GET(request({ postId: 7 }))).status).toBe(404);
  });

  /** Guards the pairing attack: a public postId must not unlock an arbitrary
      pathname that the post doesn't actually embed. */
  it("refuses a pathname the named post does not embed, even when that post is public", async () => {
    mockGetPostById.mockResolvedValue({
      ...post(ACCESS_PUBLIC),
      post_body_json: bodyReferencing("posts/someone/unrelated.jpg"),
    });

    const res = await GET(request({ postId: 7 }));

    expect(res.status).toBe(404);
    expect(mockGet).not.toHaveBeenCalled();
  });

  /** Composing a draft: the file exists in blob storage before any post row
      references it, so ownership is derived from the pathname's user segment. */
  it("serves an uploader their own file with no postId at all", async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: AUTHOR } } });

    const res = await GET(request({}));

    expect(res.status).toBe(200);
  });

  it("refuses someone else's file when no postId is supplied", async () => {
    mockGetSession.mockResolvedValue({ data: { user: { id: OTHER } } });

    const res = await GET(request({}));

    expect(res.status).toBe(404);
  });

  /** S1 from the audit: /api/upload stored a browser-declared content type
      unchecked, /api/file echoed it back, and Route Handlers are excluded from
      the middleware matcher so the response carried no CSP. Together that let
      an authenticated user serve executable HTML from this origin. */
  it("refuses to echo back a non-image content type", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PUBLIC));
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: "binary",
      blob: { contentType: "text/html" },
    });

    const res = await GET(request({ postId: 7 }));

    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("Content-Disposition")).toBe("attachment");
  });

  it("sends a sandbox CSP, since middleware never reaches this route", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PUBLIC));

    const res = await GET(request({ postId: 7 }));

    expect(res.headers.get("Content-Security-Policy")).toBe("sandbox");
  });

  it("passes an allowlisted image type through untouched", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PUBLIC));
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream: "binary",
      blob: { contentType: "image/webp" },
    });

    const res = await GET(request({ postId: 7 }));

    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Content-Disposition")).toBeNull();
  });

  it("rejects a request with no pathname", async () => {
    expect((await GET(request({ pathname: "" }))).status).toBe(400);
  });

  it("404s when the blob itself is missing", async () => {
    mockGetPostById.mockResolvedValue(post(ACCESS_PUBLIC));
    mockGet.mockResolvedValue({ statusCode: 404 });

    expect((await GET(request({ postId: 7 }))).status).toBe(404);
  });
});
