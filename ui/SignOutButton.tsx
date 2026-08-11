'use client';
import { authClient } from '@/lib/auth/client';
import { guardedExit } from '@/lib/unsaved-changes';

const defaultClassName =
    "text-left underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300";

/** `className` overrides the default styling entirely — the mobile dropdown
    renders this as a touch-sized row, the desktop nav as an inline link. */
export default function SignOutButton({ className }: { className?: string }) {
    // Routed through guardedExit so signing out mid-edit prompts first: the
    // session has to survive long enough for the user to save that work.
    const signOut = () => guardedExit(() => {
        authClient.signOut()
            .then(() => {
                window.location.href = '/';
            })
            .catch((error) => {
                console.error(error);
            });
    });

    return (
        <button className={className ?? defaultClassName} onClick={signOut}>Sign Out</button>
    );
}
