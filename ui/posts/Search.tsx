'use client'
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function Search() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue) {
                router.push(`${pathname}?q=${encodeURIComponent(searchValue)}`);
            } else {
                router.push(pathname);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchValue, router, pathname]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    };

    const handleClear = () => {
        setSearchValue('');
        inputRef.current?.focus();
    };

    return (
        <div className="relative w-full sm:max-w-md">
            {/* Magnifier icon: muted token color, sits inside the input on the left.
                pointer-events-none so clicks fall through to the input. */}
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
            <input
                ref={inputRef}
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