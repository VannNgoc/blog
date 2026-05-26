import Link from "next/link";
import { auth } from '@/lib/auth/server';
import SignOutButton from './sign-out-button';

export const dynamic = 'force-dynamic';

export default async function Header(){
    const { data: session } = await auth.getSession();
    if (session?.user) {
        return (
            <div className="flex items-center justify-between p-4 bg-zinc-800 text-zinc-50">
                <Link href="/" className="text-2xl font-medium tracking-wider text-zinc-50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">
                    recollections <span className="text-sm text-zinc-400">of {session.user.name}</span>
                </Link>
                <nav>
                    <Link href="/dashboard" className="mr-4 underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Dashbaord</Link>
                    <Link href="/posts" className="mr-4 underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Shared Posts</Link>
                    <SignOutButton />
                </nav>
                
            </div>
        )
    }else{
        return(
            <div className="flex items-center justify-between p-4 bg-zinc-800 text-zinc-50">
                <Link href="/" className="text-2xl font-medium tracking-wider text-zinc-50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">
                    recollections
                </Link>
                <nav className="text-zinc-100">
                    <Link href="/posts" className="mr-4 underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Shared Posts</Link>
                    <Link href="/auth/sign-in" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Login</Link>
                </nav>
            </div>
        )
    }
}