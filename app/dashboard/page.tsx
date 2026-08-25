import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getUserPostArchive,
  getUserPostCadence,
  getUserPostCounts,
  type ArchiveFilters,
} from "@/lib/posts/queries";
import { PostArchiveList } from "@/ui/posts/PostArchiveList";
import { PostCadence } from "@/ui/posts/PostCadence";
import { PostArchiveSkeleton } from "@/ui/posts/PostArchiveSkeleton";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import { ACCESS_PRIVATE, ACCESS_PUBLIC } from "@/lib/constants";
import { auth } from "@/lib/auth/server";
import { Search } from "@/ui/posts/Search";

export const dynamic = "force-dynamic";

/**
 * The author's workspace — deliberately a different kind of page from /posts.
 *
 * That one is for reading: cards, excerpts, ten at a time, paginated. This one
 * is for managing, so it inverts every one of those choices — the whole body of
 * work at once, no prose, one scannable column, with state and actions per row.
 *
 * Every filter lives in the URL rather than component state, matching the same
 * decision behind search and pagination: one data-fetching path, a filtered
 * view that survives a refresh and can be linked to, and no client JS for any
 * of it — the stats and the chart bars are plain links.
 */

// `month` repeats in the URL — Next hands back a string for one value and an
// array for several, so every read normalises through `monthList`.
type DashboardParams = { access?: string; month?: string | string[]; q?: string };

/** URL value → ACCESS_* constant. Anything unrecognised falls through to
    undefined, so a hand-edited query string can't smuggle in a filter — asking
    for `?access=draft` returns the unfiltered archive, not the drafts. */
const ACCESS_BY_NAME: Record<string, number> = {
  public: ACCESS_PUBLIC,
  private: ACCESS_PRIVATE,
};

function monthList(month: DashboardParams["month"]): string[] {
  if (!month) return [];
  return Array.isArray(month) ? month : [month];
}

/** Rebuilds the URL from a complete filter state. Months are sorted so the same
    selection always produces the same URL regardless of the order clicked —
    which keeps it shareable and keeps the Suspense key stable. */
function buildHref({ access, months, q }: { access?: string; months: string[]; q?: string }) {
  const next = new URLSearchParams();
  if (access) next.set("access", access);
  for (const month of [...months].sort()) next.append("month", month);
  if (q) next.set("q", q);
  const qs = next.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

/** Access is single-select: choosing one replaces the other, and choosing the
    active one clears it. Public and private are exhaustive here, so holding
    both would just be the unfiltered view. */
function toggleAccessHref(params: DashboardParams, value: string) {
  return buildHref({
    access: params.access === value ? undefined : value,
    months: monthList(params.month),
    q: params.q,
  });
}

/** Months are multi-select: each one is added to or removed from the set, so a
    run of months can be examined together. */
function toggleMonthHref(params: DashboardParams, value: string) {
  const months = monthList(params.month);
  return buildHref({
    access: params.access,
    months: months.includes(value) ? months.filter((m) => m !== value) : [...months, value],
    q: params.q,
  });
}

function Stat({
  label,
  value,
  href,
  active = false,
  navigates = false,
}: {
  label: string;
  value: number;
  href: string;
  active?: boolean;
  /** This card leaves the dashboard rather than filtering it in place. Two of
      the three are toggles, so the one that navigates has to look different —
      otherwise identical cards behave in two different ways. */
  navigates?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={!navigates ? false : undefined}
      aria-current={active ? "true" : undefined}
      className={`group relative flex flex-col gap-0.5 rounded-md border px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted-foreground sm:px-4 sm:py-3 ${
        active
          ? "border-zinc-800 bg-zinc-800 text-zinc-50 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900"
          : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
      }`}
    >
      {navigates && (
        <>
          {/* Decoration: the link role already announces itself, and the arrow
              only tells a sighted reader that this one goes somewhere. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute right-2 top-2 size-3.5 text-faint-foreground transition-transform group-hover:translate-x-0.5"
          >
            <path d="M7 17 17 7" />
            <path d="M9 7h8v8" />
          </svg>
          <span className="sr-only">(opens the drafts page)</span>
        </>
      )}
      <span
        className={`text-xl font-semibold tabular-nums sm:text-2xl ${
          active ? "text-inherit" : "text-foreground"
        }`}
      >
        {value}
      </span>
      {/* No `uppercase tracking-wide` at phone width: three labels share ~343px,
          and letter-spaced caps are the first thing to wrap. */}
      <span
        className={`text-[0.6875rem] leading-tight sm:text-xs sm:uppercase sm:tracking-wide ${
          active ? "text-inherit" : "text-faint-foreground"
        }`}
      >
        {label}
      </span>
      {active && <span className="sr-only">(filter active — select again to clear)</span>}
    </Link>
  );
}

/** Exported so it can be rendered directly in tests: it's an async component
    inside a Suspense boundary, and jsdom won't resolve one through `render()`
    of the parent — the fallback is all that ever appears. */
export async function DashboardArchive({
  userId,
  filters,
}: {
  userId: string;
  filters: ArchiveFilters;
}) {
  const posts = await getUserPostArchive(userId, filters);
  const isFiltered = Boolean(filters.access || filters.months?.length || filters.q);

  if (posts.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        {isFiltered ? "Nothing matches those filters." : "You haven't published anything yet."}
      </p>
    );
  }

  return (
    <div className="mt-6">
      {isFiltered && (
        <p className="mb-4 text-sm text-muted-foreground">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      )}
      <PostArchiveList posts={posts} showAccess showActions />
    </div>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<DashboardParams>;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  // None of these depend on each other, so they share one set of round trips
  // rather than three sequential awaits.
  const [params, counts, cadence] = await Promise.all([
    searchParams,
    getUserPostCounts(session.user.id),
    getUserPostCadence(session.user.id),
  ]);

  const months = monthList(params.month);
  const filters: ArchiveFilters = {
    access: params.access ? ACCESS_BY_NAME[params.access] : undefined,
    months,
    q: params.q,
  };
  const anyFilter = Boolean(params.access) || months.length > 0;

  return (
    <main id="main-content" className="mx-auto w-full max-w-prose p-4 pb-24 md:pb-4">
      <div className="my-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Your Posts</h1>
        <CreatePostButton />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat
          label="Published"
          value={counts.published}
          href={toggleAccessHref(params, "public")}
          active={params.access === "public"}
        />
        <Stat
          label="Private"
          value={counts.private}
          href={toggleAccessHref(params, "private")}
          active={params.access === "private"}
        />
        {/* Drafts aren't a filter: they're unfinished work with their own page
            and never appear in this archive, so this card navigates instead of
            toggling — hence the arrow. */}
        <Stat label="Drafts" value={counts.drafts} href="/drafts" navigates />
      </div>

      <div className="mt-6 sm:mt-8">
        <PostCadence
          months={cadence}
          activeMonths={months}
          monthHref={(month) => toggleMonthHref(params, month)}
        />
      </div>

      {anyFilter && (
        <div className="mt-4 flex justify-center">
          <Link
            href={params.q ? `/dashboard?q=${encodeURIComponent(params.q)}` : "/dashboard"}
            scroll={false}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted-foreground"
          >
            Clear filters
          </Link>
        </div>
      )}

      <div className="mt-6 flex justify-center sm:mt-8">
        <Search />
      </div>

      <Suspense
        key={`${params.access ?? ""}-${months.join(",")}-${params.q ?? ""}`}
        fallback={<PostArchiveSkeleton />}
      >
        <DashboardArchive userId={session.user.id} filters={filters} />
      </Suspense>
    </main>
  );
}
