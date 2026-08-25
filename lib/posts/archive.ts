import type { PostRow } from "@/type/post";

export type ArchiveEntry = Pick<PostRow, "id" | "post_name" | "post_date"> & {
  access?: number;
};

/** Year → month name → the posts filed under it. */
export type GroupedArchive = Map<number, Map<string, ArchiveEntry[]>>;

/**
 * Groups posts into years, then months, preserving whatever order they arrive
 * in — the queries already sort newest-first, and re-sorting here would let the
 * grouping silently disagree with the ORDER BY. `Map` is used rather than a
 * plain object because it keeps insertion order for numeric keys; an object
 * would reorder years ascending and quietly invert the page.
 *
 * Everything reads UTC. `post_date` is a DATE column with no time or zone, so
 * interpreting it locally shifts entries backwards for anyone west of UTC — a
 * post dated the 1st would file under the previous month.
 */
export function groupByYearAndMonth(posts: ArchiveEntry[]): GroupedArchive {
  const years: GroupedArchive = new Map();

  for (const post of posts) {
    const date = new Date(post.post_date);
    const year = date.getUTCFullYear();
    const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });

    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year)!;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(post);
  }

  return years;
}

/** The day-of-month a post is filed under, read in UTC for the reason above. */
export function archiveDay(date: PostRow["post_date"]): number {
  return new Date(date).getUTCDate();
}
