"use client"
import {useState} from 'react';
import Link from 'next/link';
import SignOutButton from './SignOutButton';

export function NavigationMenu({ isSignedIn }: { isSignedIn: boolean }){
    const [isOpen, setIsOpen] = useState(false);
    const handleClick = () => {
        setIsOpen(!isOpen);
    }
    return(
        <div className='navigation-menu'>
            {/* //desktop/tablet menu */}
            <nav className="text-zinc-100 hidden md:flex md:items-center md:gap-4">
                {isSignedIn ? <Link href="/dashboard" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Dashboard</Link> : null}
                <Link href="/posts" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Shared Posts</Link>
                {isSignedIn ? <SignOutButton /> : <Link href="/auth/sign-in" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Login</Link>}
            </nav>
            {/* //mobile menu */}
            <button className="md:hidden" onClick={handleClick} aria-label={isOpen ? "Close menu" : "Open menu"}>
                {isOpen ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>}
            </button>
            {/* //mobile menu content */}
            {isOpen && (
                <div className='navigation-menu-content flex flex-col gap-2 absolute top-10 right-0 p-4 bg-zinc-800 text-zinc-50 rounded-lg z-10'>
                    {isSignedIn ? <Link href="/dashboard" className='text-zinc-100 hover:text-white hover:underline'>Dashboard</Link> : null}
                    <Link href="/posts" className='text-zinc-100 hover:text-white hover:underline'>Shared Posts</Link>
                    {isSignedIn ? <SignOutButton /> : <Link href="/auth/sign-in" className='text-zinc-100 hover:text-white hover:underline'>Login</Link>}
                </div>
            )}
        </div>
    )
}