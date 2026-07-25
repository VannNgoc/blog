"use client"
import { useRouter, useSearchParams } from 'next/navigation'
import { PAGINATION_LIMIT } from '@/lib/constants'

export function PostsNavBar({ numberPosts } : { numberPosts: number }){

    const searchParams = useSearchParams();
    const currentPage = Number(searchParams.get('page')) || 1;
    const router = useRouter();
    const numOfPage = Math.ceil(numberPosts / PAGINATION_LIMIT);

    function handlePageChange(pageNumber : number){
        const params = new URLSearchParams(searchParams);
        params.set('page', String(pageNumber));
        router.push(`?${params.toString()}`);
    }

    if (numOfPage <= 1) return null;

    const buttons = Array.from({ length: numOfPage }, (_, i) => {
        const pageNumber = i + 1;
        const isActive = currentPage === pageNumber;
        return (
            <button
                key={`page-${pageNumber}`}
                onClick={() => handlePageChange(pageNumber)}
                aria-current={isActive ? 'page' : undefined}
                className={
                    isActive
                        ? 'min-w-9 rounded-md border border-zinc-800 bg-zinc-800 px-2 py-1 text-sm text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                        : 'min-w-9 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600 transition hover:border-zinc-800 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-300 dark:hover:text-zinc-50'
                }
            >
                {pageNumber}
            </button>
        );
    });

    return(
        <div className='post-nav-bar mt-8 flex justify-center gap-1.5'>
            {buttons}
        </div>
    );
}