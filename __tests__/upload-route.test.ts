/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

jest.mock("@vercel/blob", () => ({
  put: jest.fn(),
}));

jest.mock("@/lib/auth/server", () => ({
  auth: { getSession: jest.fn() },
}));

jest.mock("@/lib/rate-limit", () => ({
  isRateLimited: jest.fn(() => false),
}));

import { POST } from "@/app/api/upload/route";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth/server";
import { isRateLimited } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

const mockPut = put as jest.Mock;
const mockGetSession = auth.getSession as jest.Mock;
const mockIsRateLimited = isRateLimited as jest.Mock;

const USER = "user-uuid";

/** A stand-in for the browser's File: `type` and `name` are whatever the client
    claims, which is exactly the point — the route must not trust either. */
function file({ name = "photo.jpg", type = "image/jpeg", size = 1024 } = {}) {
  return { name, type, size } as unknown as File;
}

function request(f: unknown) {
  return {
    formData: async () => ({ get: (k: string) => (k === "file" ? f : null) }),
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { user: { id: USER } } });
  mockIsRateLimited.mockReturnValue(false);
  mockPut.mockResolvedValue({ pathname: `posts/${USER}/uuid-photo.jpg` });
});

describe("/api/upload", () => {
  it("stores an allowlisted image", async () => {
    const res = await POST(request(file()));

    expect(res.status).toBe(200);
    expect(mockPut).toHaveBeenCalled();
  });

  /** The upload half of audit finding S1. Without this, a text/html blob could
      be stored and later served same-origin as an executable document. */
  it.each(["text/html", "image/svg+xml", "application/pdf", "text/plain", ""])(
    "refuses content type %p",
    async (type) => {
      const res = await POST(request(file({ type })));

      expect(res.status).toBe(415);
      expect(mockPut).not.toHaveBeenCalled();
    },
  );

  it("refuses a file above the size cap", async () => {
    const res = await POST(request(file({ size: MAX_UPLOAD_BYTES + 1 })));

    expect(res.status).toBe(413);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("accepts a file exactly at the cap", async () => {
    const res = await POST(request(file({ size: MAX_UPLOAD_BYTES })));

    expect(res.status).toBe(200);
  });

  /** The stored path is security-relevant: /api/file derives ownership by
      splitting it on "/". A filename must not be able to introduce segments. */
  it("strips path separators from the filename", async () => {
    await POST(request(file({ name: "../../etc/passwd.jpg" })));

    const storedPath = mockPut.mock.calls[0][0] as string;
    const segments = storedPath.split("/");

    expect(segments).toHaveLength(3);
    expect(segments[0]).toBe("posts");
    expect(segments[1]).toBe(USER);
    expect(storedPath).not.toContain("..");
  });

  it("strips control and quoting characters from the filename", async () => {
    await POST(request(file({ name: 'a"b<c>d\ne.jpg' })));

    const storedPath = mockPut.mock.calls[0][0] as string;
    expect(storedPath).not.toMatch(/["<>\n]/);
  });

  it("bounds an absurdly long filename", async () => {
    await POST(request(file({ name: "x".repeat(5000) + ".jpg" })));

    const stored = (mockPut.mock.calls[0][0] as string).split("/")[2];
    expect(stored.length).toBeLessThan(200);
  });

  it("scopes the stored path to the uploading user", async () => {
    await POST(request(file()));

    expect(mockPut.mock.calls[0][0]).toMatch(new RegExp(`^posts/${USER}/`));
  });

  it("rejects an unauthenticated upload before touching storage", async () => {
    mockGetSession.mockResolvedValue({ data: null });

    const res = await POST(request(file()));

    expect(res.status).toBe(401);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("honours the rate limit", async () => {
    mockIsRateLimited.mockReturnValue(true);

    const res = await POST(request(file()));

    expect(res.status).toBe(429);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("rejects a request with no file", async () => {
    expect((await POST(request(null))).status).toBe(400);
  });
});
