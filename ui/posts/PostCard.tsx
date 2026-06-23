import Link from "next/link";
import type { PostWithAuthorRow } from "@/type/post";
import { tiptapFirstBlockText } from "@/lib/tiptap-content";
import { DeletePostConfirmButton } from "@/ui/posts/DeletePostConfirmationButton";
import { EditButton } from "@/ui/posts/EditButton";

type PostCardProps = {
  post: PostWithAuthorRow;
  isAuthor: boolean;
};

export function PostCard({ post, isAuthor }: PostCardProps) {
  // Prefer the author's description; fall back to the post's opening block.
  const preview = post.post_description?.trim() || tiptapFirstBlockText(post.post_body_json);

  return (
    <li className="rounded-lg border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900 relative group">
      <Link href={`/posts/${post.id}`} className="block">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">{post.post_name}</h2>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Author: {post.username}</p>

        <p className="my-3 text-sm line-clamp-3 text-zinc-800 dark:text-zinc-200">
          {preview}
        </p>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {new Date(post.post_date).toLocaleDateString()}
        </p>
      </Link>
      <div className="flex absolute top-2 right-2 gap-2">
        {isAuthor && <DeletePostConfirmButton id={post.id} />}
        {isAuthor && <EditButton id={post.id} />}
      </div>
    </li>
  );
}
