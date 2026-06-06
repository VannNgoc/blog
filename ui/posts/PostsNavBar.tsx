"use client"
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PAGINATION_LIMIT } from '@/lib/constants'

export function PostsNavBar({ numberPosts } : { numberPosts: number }){

    const searchParams = useSearchParams();
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const router = useRouter();
    const numOfPage = Math.ceil(numberPosts / PAGINATION_LIMIT);

    function handlePageChange(pageNumber : number){
        setCurrentPage(pageNumber)
        router.push(`?page=${pageNumber}`);
    }

    const buttons = Array.from({ length: numOfPage }, (_, i) => (
        currentPage !== i + 1
        ? <button className="px-2 mx-1 border border-gray-400 text-gray-400 hover:border-gray-800 hover:text-gray-800" key={`page-${i+1}`} onClick={() => handlePageChange(i+1)}>
            {i + 1}
        </button>
        : <button className="px-2 mx-1 border border-gray-800 bg-gray-800 text-white" key={`page-${i+1}`} onClick={() => handlePageChange(i+1)}>
            {i + 1}
        </button>
    ));

    return(
        <div className='post-nav-bar my-2'>
            {buttons}
        </div>
    );
}