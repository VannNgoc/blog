"use client"
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import SignOutButton from './SignOutButton';

/* The dropdown is the only navigation on phones and tablets, so its rows are
   sized for fingers: 44px tall (Apple's HIG minimum — WCAG 2.2's 24px floor is
   the bare minimum, not a target) and full-panel width, so the whole strip is
   tappable instead of just the glyphs. Padding does the work, not a larger
   font, so the menu keeps its proportions. A hover/active fill replaces the
   underline, since underline is a mouse affordance that touch never sees. */
const mobileItemClass =
    "flex min-h-11 w-full items-center whitespace-nowrap rounded-md px-3 py-2 text-zinc-100 transition-colors hover:bg-zinc-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300";

export function NavigationMenu({ isSignedIn }: { isSignedIn: boolean }){
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const handleClick = () => {
        setIsOpen(!isOpen);
    }

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [isOpen]);

    return(
        <div className='navigation-menu' ref={menuRef}>
            {/* //desktop/tablet menu */}
            <nav className="text-zinc-100 hidden md:flex md:items-center md:gap-4">
                {isSignedIn ? <Link href="/dashboard" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Dashboard</Link> : null}
                {isSignedIn ? <Link href="/drafts" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Drafts</Link> : null}
                <Link href="/posts" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Shared Posts</Link>
                <Link href="/archive" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Archive</Link>
                {isSignedIn ? <SignOutButton /> : <Link href="/auth/sign-in" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Login</Link>}
            </nav>
            {/* //mobile menu */}
            <button
                /* `after:-inset-1.5` is an invisible 44px touch target over this
                   32px button — see the same treatment on ThemeToggle. It keeps
                   the header's height unchanged on phones. */
                className="relative md:hidden rounded-md p-1.5 text-zinc-100 transition after:absolute after:-inset-1.5 after:content-[''] hover:bg-zinc-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
                onClick={handleClick}
                aria-label={isOpen ? "Close menu" : "Open menu"}
            >
                {isOpen ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg> : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>}
            </button>
            {/* //mobile menu content */}
            {isOpen && (
                /* Close on any activated item. This component isn't remounted
                   by a client-side navigation, so `isOpen` would otherwise
                   survive the route change and leave the panel sitting over the
                   new page. Delegating to the panel (rather than an onClick per
                   item) also covers Sign Out, and closes even when the tapped
                   link is the route we're already on — which a pathname-watching
                   effect would miss, since the pathname never changes. */
                <div
                    /* `top-full` anchors the panel to the header's bottom edge
                       rather than a fixed 40px, which used to land inside the
                       header and cover the theme toggle and the site name; it
                       tracks the header's real height, so it stays correct if
                       that height ever changes. `-mt-1` then tucks it 4px under
                       that edge for a tighter join — the header controls and
                       their 44px touch targets all end ~10px above the seam, so
                       nothing is covered. Only the bottom corners are rounded —
                       square tops let the panel read as continuous with the
                       header it hangs from. The shadow separates it from the
                       page content it hangs over. */
                    className='navigation-menu-content flex flex-col gap-1 absolute top-full right-0 -mt-1 p-2 bg-zinc-800 text-zinc-50 rounded-b-lg shadow-lg z-10'
                    onClick={(e) => {
                        if ((e.target as HTMLElement).closest('a, button')) setIsOpen(false);
                    }}
                >
                    {isSignedIn ? <Link href="/dashboard" className={mobileItemClass}>Dashboard</Link> : null}
                    {isSignedIn ? <Link href="/drafts" className={mobileItemClass}>Drafts</Link> : null}
                    <Link href="/posts" className={mobileItemClass}>Shared Posts</Link>
                    <Link href="/archive" className={mobileItemClass}>Archive</Link>
                    {isSignedIn ? <SignOutButton className={mobileItemClass} /> : <Link href="/auth/sign-in" className={mobileItemClass}>Login</Link>}
                </div>
            )}
        </div>
    )
}