import Link from "next/link";
import type { PostRow } from "@/type/post";
import { DeletePostConfirmButton } from "@/ui/posts/DeletePostConfirmationButton";
import { EditButton } from "@/ui/posts/EditButton";

type PostCardProps = {
  post: PostRow;
};

export function PostCard({ post }: PostCardProps) {
  return (
    <li className="rounded-lg border p-4 hover:bg-zinc-50 transition">
      <Link href={`/posts/${post.id}`} className="block">
        <h2 className="text-lg font-medium">{post.post_name}</h2>

        <p className="text-sm text-gray-600">
          {new Date(post.post_date).toLocaleDateString()}
        </p>

        <p className="mt-3 text-sm line-clamp-3">
          {post.post_body}
        </p>
      </Link>
      <DeletePostConfirmButton id={post.id} />
      <EditButton id={post.id} />
    </li>
  );
}