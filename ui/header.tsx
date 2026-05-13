import Link from "next/link";

export default function Header(){
    return(
        <div className="flex items-center justify-between p-4 bg-zinc-800 text-zinc-50">
            <Link href="/" className="text-4xl font-medium tracking-wider text-zinc-50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">
                recollections
            </Link>
            <nav className="text-zinc-100">
                <Link href="/posts" className="mr-4 underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Posts</Link>
                <Link href="/login" className="underline-offset-4 hover:underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300">Login</Link>
            </nav>
        </div>
    )
}