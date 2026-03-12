import Link from "next/link";
import type { PostRow } from "@/type/post";
import { DeletePostConfirmButton } from "@/ui/posts/DeletePostConfirmationButton";
import { EditButton } from "@/ui/posts/EditButton";

type PostCardProps = {
  post: PostRow;
};

export function PostCard({ post }: PostCardProps) {
  return (
    <li className="rounded-lg border p-4 hover:bg-zinc-50 transition relative group">
      <Link href={`/posts/${post.id}`} className="block">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-medium">{post.post_name}</h2>
        </div>


        <p className="text-sm text-gray-600">
          {new Date(post.post_date).toLocaleDateString()}
        </p>

        <p className="mt-3 text-sm line-clamp-3">
          {post.post_body}
        </p>
      </Link>
      <div className="flex absolute top-2 right-2 gap-2">
        <DeletePostConfirmButton id={post.id} />
        <EditButton id={post.id} />
      </div>

    </li>
  );
}