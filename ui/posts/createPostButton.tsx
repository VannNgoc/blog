import Link from "next/link";

export async function CreatePostButton({ href = "/posts/create" }: { href?: string } = {}) {
    return (
        <Link href={href} className="btn">New Post</Link>
    )
}