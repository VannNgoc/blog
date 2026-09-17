import { SITE_TIME_ZONE } from "@/lib/constants";

/** Today's calendar date in the site's time zone, as YYYY-MM-DD.
 *
 *  Not the server clock: Vercel functions run in UTC, so a post saved at 9pm
 *  in New York would otherwise be dated tomorrow. `en-CA` is used only because
 *  its short date format already is YYYY-MM-DD. */
export function todayInSiteTimeZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
