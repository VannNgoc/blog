import Link from "next/link";

export default function Header(){
    return(
        <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
            <Link href="/" className="text-4xlfont-medium tracking-wider text-white dark:text-zinc-200">
                recollections
            </Link>
            <nav>
                <Link href="/posts" className="mr-4 hover:underline">Posts</Link>
                <Link href="/login" className="hover:underline">Login</Link>
            </nav>
        </div>
    )
}