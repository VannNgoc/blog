import { PostCardSkeleton } from "@/ui/posts/PostCardSkeleton";
import { PAGINATION_LIMIT } from "@/lib/constants";

export function PostListSkeleton({ count = PAGINATION_LIMIT }: { count?: number }) {
  return (
    <ul className="space-y-4 mt-6">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </ul>
  );
}
