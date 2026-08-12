import robots from "@/app/robots";

describe("robots", () => {
  it("allows crawling by default", () => {
    const result = robots();
    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("disallows every authenticated/app-chrome route", () => {
    const result = robots();
    const disallow = (result.rules as { disallow: string[] }).disallow;

    expect(disallow).toEqual(
      expect.arrayContaining(["/account", "/dashboard", "/posts/create", "/posts/*/edit", "/auth"])
    );
  });

  it("does not disallow the public posts list or individual post pages", () => {
    const result = robots();
    const disallow = (result.rules as { disallow: string[] }).disallow;

    expect(disallow).not.toContain("/posts");
  });

  it("points to the sitemap under the same base URL", () => {
    const result = robots();
    expect(result.sitemap).toMatch(/^https?:\/\/[^/]+\/sitemap\.xml$/);
  });
});
