import Link from "next/link";

export async function CreatePostButton() {
    return (
        <Link href="/posts/create" className="btn">New Post</Link>
    )
}