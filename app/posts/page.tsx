import Link from "next/link";
export default function PostPage(){
    return(
        <div className="container mx-auto p-4">
            <h1>All Posts</h1>
            <Link className="btn" href="posts/create">Create</Link>
        </div>
    )
}
