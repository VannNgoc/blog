'use client'
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function Search() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // The query the page is currently *rendered* for, as opposed to what's
    // been typed but not yet navigated to.
    const activeQuery = searchParams.get('q') ?? '';
    const [searchValue, setSearchValue] = useState(activeQuery);
    // Marking the navigation as a transition is what makes it observable:
    // without it, a search on this page gave no feedback at all between the
    // last keystroke and the new list appearing.
    const [isPending, startTransition] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Already showing what's typed — nothing to navigate to. This also
        // skips the push this effect used to fire on mount, which re-requested
        // the page the user had just loaded and would now flash the pending
        // spinner on every visit.
        if (searchValue === activeQuery) return;

        const timer = setTimeout(() => {
            startTransition(() => {
                if (searchValue) {
                    router.push(`${pathname}?q=${encodeURIComponent(searchValue)}`);
                } else {
                    router.push(pathname);
                }
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [searchValue, activeQuery, router, pathname]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    };

    const handleClear = () => {
        setSearchValue('');
        inputRef.current?.focus();
    };

    return (
        <div className="relative w-full sm:max-w-md">
            <label htmlFor="post-search" className="sr-only">
                Search posts
            </label>
            {/* Left slot: magnifier normally, spinner while a search navigation
                is in flight. Both occupy the same box so swapping one for the
                other shifts nothing. pointer-events-none so clicks fall through
                to the input. */}
            {isPending ? (
                <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-(--muted-foreground)"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="9" className="opacity-25" />
                    <path d="M21 12a9 9 0 0 0-9-9" />
                </svg>
            ) : (
                <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted-foreground)"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
            )}
            {/* The spinner is aria-hidden decoration; this is what actually
                reaches a screen reader. The results list has its own
                aria-live region, so this only announces the in-between state
                and goes quiet once the new list arrives. */}
            <span role="status" aria-live="polite" className="sr-only">
                {isPending ? 'Searching…' : ''}
            </span>
            <input
                ref={inputRef}
                id="post-search"
                placeholder="Search posts..."
                type="text"
                value={searchValue}
                onChange={handleSearch}
                className="w-full rounded-lg border border-(--border-subtle) bg-white py-2 pl-9 pr-8 text-sm text-foreground shadow-sm transition placeholder:text-(--muted-foreground) focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900"
            />
            {searchValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-(--muted-foreground) transition hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                >
                    <svg
                        className="h-3.5 w-3.5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}