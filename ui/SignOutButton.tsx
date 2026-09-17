'use client';
import { guardedExit } from '@/lib/unsaved-changes';

const defaultClassName =
    "text-left underline-offset-4 hover:underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300";

/** `className` overrides the default styling entirely — the mobile dropdown
    renders this as a touch-sized row, the desktop nav as an inline link. */
export default function SignOutButton({ className }: { className?: string }) {
    // Routed through guardedExit so signing out mid-edit prompts first: the
    // session has to survive long enough for the user to save that work.
    //
    // The auth client is imported on click rather than at the top of the file.
    // This button lives in the header, so a static import put better-auth and
    // all of zod (~100KB gzipped) into the shared bundle of every route —
    // including the landing page, where most visitors are signed out and never
    // see this button at all. Loading it on demand costs one small request at
    // the moment someone actually signs out.
    const signOut = () => guardedExit(() => {
        import('@/lib/auth/client')
            .then(({ authClient }) => authClient.signOut())
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
