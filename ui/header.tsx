import Link from "next/link";
import { auth } from '@/lib/auth/server';
import { NavigationMenu } from '@/ui/NavigationMenu';
import { ThemeToggle } from '@/ui/ThemeToggle';

export const dynamic = 'force-dynamic';

export default async function Header(){
    const { data: session } = await auth.getSession();
    if (session?.user) {
        return (
            <div className="flex items-center justify-between p-4 bg-zinc-800 text-zinc-50">
                <Link href="/" className="text-2xl font-medium tracking-wider text-zinc-50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">
                    recollections <span className="text-sm text-zinc-400">of {session.user.name}</span>
                </Link>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <NavigationMenu isSignedIn={true} />
                </div>
            </div>
        )
    }else{
        return(
            <div className="flex items-center justify-between p-4 bg-zinc-800 text-zinc-50">
                <Link href="/" className="text-2xl font-medium tracking-wider text-zinc-50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">
                    recollections
                </Link>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <NavigationMenu isSignedIn={session?.user ? true : false} />
                </div>
            </div>
        )
    }
}