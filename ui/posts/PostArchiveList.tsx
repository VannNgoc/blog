import Link from "next/link";
import { groupByYearAndMonth, archiveDay, type ArchiveEntry } from "@/lib/posts/archive";
import { ACCESS_PUBLIC } from "@/lib/constants";
import { EditButton } from "@/ui/posts/EditButton";

type PostArchiveListProps = {
  posts: ArchiveEntry[];
  /** Mark each row public or private. Only meaningful where the list can hold
      both — the public archive is uniformly public, so it stays off there. */
  showAccess?: boolean;
  /** An edit affordance per row. Author-facing views only; deleting happens on
      the post's own page, not from a dense list. */
  showActions?: boolean;
};

/**
 * A dense, chronological index of posts — the counterpart to `PostCard`.
 *
 * The two exist for genuinely different jobs, which is why they look nothing
 * alike: a card is for *reading*, so it spends space on an excerpt and shows
 * ten at a time; this is for *finding and managing*, so it drops the prose,
 * shows everything at once, and puts the title in a single scannable column.
 *
 * Laid out mobile-first, and the row never wraps. A long title wraps inside its
 * own column while the badge and edit affordance stay pinned to the first line,
 * so a short title is a one-line row and a long one grows by exactly the lines
 * it needs — no truncation, and no wasted second line on "Thought".
 */
export function PostArchiveList({ posts, showAccess = false, showActions = false }: PostArchiveListProps) {
  const years = groupByYearAndMonth(posts);

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {[...years].map(([year, months]) => (
        <section key={year} aria-labelledby={`year-${year}`}>
          <h2
            id={`year-${year}`}
            className="border-b border-zinc-200 pb-2 text-lg font-semibold text-foreground dark:border-zinc-700"
          >
            {year}
          </h2>

          <div className="mt-4 flex flex-col gap-5 sm:gap-6">
            {[...months].map(([month, monthPosts]) => (
              <div key={month}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-faint-foreground">
                  {month}
                </h3>
                <ul className="mt-2 flex flex-col">
                  {monthPosts.map((post) => {
                    const isPrivate = showAccess && post.access !== ACCESS_PUBLIC;
                    return (
                      <li
                        key={post.id}
                        // `items-start`, no wrapping: the title wraps inside its
                        // own column instead of pushing the badge and buttons
                        // onto a line of their own. A short title is a one-line
                        // row; a long one grows by exactly the lines it needs,
                        // and nothing is ever truncated — the title is the only
                        // content here, so hiding half of it is the one thing
                        // this list can't do.
                        className="group flex items-start gap-x-3 rounded-md py-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        {/* Fixed-width tabular day so titles align into one
                            column the eye can run down. `leading-6` gives it the
                            same line box as the title, so the two sit on a
                            shared first line rather than the smaller text
                            hugging the top. */}
                        <span className="w-6 shrink-0 text-right font-mono text-xs leading-6 tabular-nums text-faint-foreground">
                          {archiveDay(post.post_date)}
                        </span>

                        <Link
                          href={`/posts/${post.id}`}
                          transitionTypes={["nav-forward"]}
                          className="min-w-0 flex-1 break-words leading-6 text-foreground underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--muted-foreground)"
                        >
                          {post.post_name.trim()}
                        </Link>

                        {/* Pinned to the first line via the same 24px line box,
                            so the row's right edge stays put however many lines
                            the title runs to. Kept after the title in the DOM as
                            well as on screen: an earlier version moved the title
                            below with `order-last`, which put focus order at
                            odds with visual order — tab landed on the title on
                            line two, then jumped back up to the buttons. */}
                        {(showAccess || showActions) && (
                          <span className="flex h-6 shrink-0 items-center gap-2">
                            {showAccess && (
                              <span
                                className={
                                  isPrivate
                                    ? "shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                                    : "shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[0.6875rem] font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-500"
                                }
                              >
                                {isPrivate ? "Private" : "Public"}
                              </span>
                            )}

                            {showActions && (
                              // Edit only. Delete lives on the post's own page
                              // instead: the two actions differ sharply in both
                              // frequency and risk, and treating them alike put
                              // an irreversible action permanently visible a
                              // thumb's width from a row you scroll past, in a
                              // list of near-identical entries. Editing stays
                              // one tap; deleting now happens where you can see
                              // what you're deleting.
                              //
                              // `hover-reveal` fades this in on pointer devices
                              // and leaves it permanently visible on touch,
                              // where no hover event will ever arrive.
                              <span className="hover-reveal flex shrink-0 items-center">
                                <EditButton id={post.id} />
                              </span>
                            )}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
