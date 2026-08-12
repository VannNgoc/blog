jest.mock("server-only", () => ({}));

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { headers } from "next/headers";

const mockHeaders = headers as jest.Mock;

describe("isRateLimited", () => {
  // Each test uses a unique key so the module's shared bucket map never
  // leaks state between tests without needing jest.resetModules().
  let key: string;
  let counter = 0;

  beforeEach(() => {
    key = `test-key-${counter++}`;
  });

  it("allows the first request", () => {
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
  });

  it("allows requests up to the limit and blocks the next one", () => {
    expect(isRateLimited(key, 3, 60_000)).toBe(false); // 1
    expect(isRateLimited(key, 3, 60_000)).toBe(false); // 2
    expect(isRateLimited(key, 3, 60_000)).toBe(false); // 3
    expect(isRateLimited(key, 3, 60_000)).toBe(true); // 4th exceeds the limit
  });

  it("keeps blocking further requests once the limit is exceeded", () => {
    for (let i = 0; i < 3; i++) isRateLimited(key, 3, 60_000);
    expect(isRateLimited(key, 3, 60_000)).toBe(true);
    expect(isRateLimited(key, 3, 60_000)).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const otherKey = `${key}-other`;
    for (let i = 0; i < 3; i++) isRateLimited(key, 3, 60_000);

    expect(isRateLimited(key, 3, 60_000)).toBe(true);
    expect(isRateLimited(otherKey, 3, 60_000)).toBe(false);
  });

  it("resets the count once the window has passed", () => {
    const nowSpy = jest.spyOn(Date, "now");
    try {
      nowSpy.mockReturnValue(1_000_000);
      for (let i = 0; i < 3; i++) isRateLimited(key, 3, 60_000);
      expect(isRateLimited(key, 3, 60_000)).toBe(true);

      // Advance past the window's resetAt (now + windowMs).
      nowSpy.mockReturnValue(1_000_000 + 60_000 + 1);
      expect(isRateLimited(key, 3, 60_000)).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe("getClientIp", () => {
  function mockRequestHeaders(value: string | null) {
    mockHeaders.mockResolvedValue({
      get: (name: string) => (name === "x-forwarded-for" ? value : null),
    });
  }

  it("returns the first IP when x-forwarded-for has a single value", async () => {
    mockRequestHeaders("203.0.113.5");
    expect(await getClientIp()).toBe("203.0.113.5");
  });

  it("returns only the first IP when x-forwarded-for has a proxy chain", async () => {
    mockRequestHeaders("203.0.113.5, 70.41.3.18, 150.172.238.178");
    expect(await getClientIp()).toBe("203.0.113.5");
  });

  it("trims whitespace around the first IP", async () => {
    mockRequestHeaders("  203.0.113.5  , 70.41.3.18");
    expect(await getClientIp()).toBe("203.0.113.5");
  });

  it("returns 'unknown' when the header is missing", async () => {
    mockRequestHeaders(null);
    expect(await getClientIp()).toBe("unknown");
  });

  it("returns 'unknown' when the header is present but empty", async () => {
    mockRequestHeaders("");
    expect(await getClientIp()).toBe("unknown");
  });
});
