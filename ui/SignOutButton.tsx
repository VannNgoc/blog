'use client';
import { authClient } from '@/lib/auth/client';

export default function SignOutButton() {
    return (
        <button className="text-left underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300" onClick={() => authClient.signOut()
            .then(() => {
                window.location.href = '/';
            })
            .catch((error) => {
                console.error(error);
            })
        }>Sign Out</button>
    );
}
