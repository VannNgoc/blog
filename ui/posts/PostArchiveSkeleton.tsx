/**
 * Placeholder for `PostArchiveList` while its query resolves.
 *
 * Mirrors that component's structure rather than reusing `PostListSkeleton`,
 * which draws post *cards* — a skeleton that doesn't match what replaces it
 * produces a visible reflow at the swap, which is the one thing a skeleton is
 * supposed to prevent. Same year rule, same month labels, same row rhythm, and
 * the same fixed-width day column so titles don't shift sideways when the real
 * list arrives.
 *
 * Row widths vary deliberately: a column of identical bars reads as a loading
 * *pattern*, whereas ragged lengths read as text about to appear.
 */
const ROW_WIDTHS = ["w-3/5", "w-4/5", "w-1/2", "w-2/3", "w-3/4", "w-5/12"];

function SkeletonMonth({ label, rows, offset }: { label: string; rows: number; offset: number }) {
  return (
    <div>
      <div className="skeleton h-3 w-16 rounded" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <ul className="mt-2 flex flex-col">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 sm:flex-nowrap sm:py-1.5">
            <div className="skeleton h-3 w-6 shrink-0 rounded" aria-hidden="true" />
            <div
              className={`skeleton order-last h-4 basis-full rounded pl-9 sm:order-none sm:basis-auto sm:pl-0 ${ROW_WIDTHS[(i + offset) % ROW_WIDTHS.length]}`}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PostArchiveSkeleton({ months = 2 }: { months?: number }) {
  return (
    <div
      className="mt-6 flex flex-col gap-8 sm:gap-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading your posts</span>

      <section>
        {/* The year rule, matched to the real heading's border. */}
        <div className="border-b border-zinc-200 pb-2 dark:border-zinc-700">
          <div className="skeleton h-6 w-14 rounded" aria-hidden="true" />
        </div>

        <div className="mt-4 flex flex-col gap-5 sm:gap-6">
          {Array.from({ length: months }, (_, i) => (
            <SkeletonMonth key={i} label={`Month ${i + 1}`} rows={i === 0 ? 4 : 3} offset={i * 2} />
          ))}
        </div>
      </section>
    </div>
  );
}
