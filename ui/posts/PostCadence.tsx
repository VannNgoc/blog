import Link from "next/link";

type CadenceMonth = { month: string; count: number };

type PostCadenceProps = {
  months: CadenceMonth[];
  /** Every "YYYY-MM" currently filtered. */
  activeMonths?: string[];
  /** Builds the href for toggling a month on or off. Omit to render a static
      strip — the public archive has nothing to filter. */
  monthHref?: (month: string) => string;
};

/**
 * Twelve months of writing rhythm as a bar strip, doubling as a month filter.
 *
 * Deliberately not a chart library: twelve values need twelve divs, and a
 * dependency would cost more than the whole feature.
 *
 * The track has an explicit height rather than `flex-1`. A percentage height
 * resolves against the parent's *definite* height, and a flex-sized parent
 * doesn't have one — the first version rendered twelve zero-height divs, which
 * is to say nothing at all. Heights are a percentage of the busiest month
 * rather than an absolute scale, so the shape reads the same whether you write
 * three posts a month or thirty.
 */
export function PostCadence({ months, activeMonths = [], monthHref }: PostCadenceProps) {
  const busiest = Math.max(...months.map((m) => m.count), 1);
  const total = months.reduce((sum, m) => sum + m.count, 0);
  const active = months.filter((m) => m.count > 0).length;

  return (
    <section aria-labelledby="cadence-heading" className="flex flex-col gap-2 sm:gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="cadence-heading"
          className="text-xs font-semibold uppercase tracking-wide text-faint-foreground"
        >
          Last 12 months
        </h2>
        <p className="text-xs text-muted-foreground">
          {total} {total === 1 ? "post" : "posts"} across {active}{" "}
          {active === 1 ? "month" : "months"}
        </p>
      </div>

      <ul className="flex items-end gap-1">
        {months.map((m) => {
          const [year, monthNum] = m.month.split("-");
          const label = new Date(Number(year), Number(monthNum) - 1).toLocaleString("en-US", {
            month: "short",
          });
          const pct = m.count > 0 ? Math.max((m.count / busiest) * 100, 10) : 0;
          const isActive = activeMonths.includes(m.month);
          const noun = m.count === 1 ? "post" : "posts";

          const column = (
            <>
              {/* Definite height — see the note above. */}
              <span className="flex h-10 w-full items-end sm:h-14">
                {m.count > 0 ? (
                  <span
                    className={
                      isActive
                        ? "w-full rounded-sm bg-zinc-900 dark:bg-white"
                        : // zinc-500 in both themes, not a lighter grey: these bars
                          // carry the data, so WCAG 1.4.11 asks 3:1 against the
                          // page. zinc-300 on white measured 1.48:1 and zinc-600
                          // on the dark ground 2.56:1 — both invisible to anyone
                          // with reduced contrast sensitivity. This lands at 4.83
                          // and 4.10, and still reads clearly as "not selected"
                          // beside the near-black/near-white active bar.
                          "w-full rounded-sm bg-zinc-500 transition-colors group-hover:bg-zinc-700 dark:bg-zinc-500 dark:group-hover:bg-zinc-300"
                    }
                    style={{ height: `${pct}%` }}
                  />
                ) : (
                  // A month with nothing in it keeps a baseline so the strip
                  // reads as a continuous timeline rather than a gap. It has to
                  // be *visible* to do that job: at zinc-800 on the dark ground
                  // this sat ~12 points of lightness above the page at 2px tall,
                  // which made five empty months look like missing data instead
                  // of five months without a post. Still clearly recessive
                  // against the zinc-500 bars, just no longer invisible.
                  <span className="h-0.5 w-full rounded-sm bg-zinc-300 dark:bg-zinc-700" />
                )}
              </span>
              {/* Three letters, not one: a lone "J" is ambiguous three times a
                  year. Twelve columns share the prose width, so the type stays
                  small and the label is allowed to clip rather than wrap. */}
              <span
                className={`w-full overflow-hidden text-center text-[0.625rem] leading-none whitespace-nowrap sm:text-[0.6875rem] ${
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </>
          );

          return (
            <li key={m.month} className="flex flex-1">
              {monthHref && m.count > 0 ? (
                <Link
                  href={monthHref(m.month)}
                  scroll={false}
                  aria-current={isActive ? "true" : undefined}
                  // The bar is a shape, not a label — the accessible name has to
                  // carry the month, the count, and what activating it does.
                  // Months union rather than replace, so the label says add/remove
                  // rather than filter/clear — otherwise a second selection reads
                  // as if it will discard the first.
                  aria-label={`${isActive ? "Remove" : "Add"} ${label} ${year} (${m.count} ${noun})`}
                  className="group flex w-full flex-col items-center gap-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted-foreground"
                >
                  {column}
                </Link>
              ) : (
                <span
                  className="flex w-full flex-col items-center gap-1"
                  title={`${label} ${year}: ${m.count} ${noun}`}
                >
                  {column}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
