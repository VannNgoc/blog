import { todayInSiteTimeZone } from "@/lib/dates";

describe("todayInSiteTimeZone", () => {
  it("keeps a late-evening New York save on the same day, though UTC has rolled over", () => {
    // 11:30pm EDT on Sep 15 is 03:30 UTC on Sep 16.
    expect(todayInSiteTimeZone(new Date("2026-09-16T03:30:00Z"))).toBe("2026-09-15");
  });

  it("rolls over at local midnight", () => {
    // 12:05am EDT on Sep 16.
    expect(todayInSiteTimeZone(new Date("2026-09-16T04:05:00Z"))).toBe("2026-09-16");
  });

  it("follows daylight saving time", () => {
    // 11:30pm EST (UTC-5) on Jan 15 is 04:30 UTC on Jan 16.
    expect(todayInSiteTimeZone(new Date("2026-01-16T04:30:00Z"))).toBe("2026-01-15");
  });

  it("formats as zero-padded YYYY-MM-DD", () => {
    expect(todayInSiteTimeZone(new Date("2026-02-03T17:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
