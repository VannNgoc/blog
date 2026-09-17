import "server-only";
import { getPostById } from "@/lib/posts/queries";

/** The post, if it exists and `userId` wrote it; otherwise null.

    Shared by the two routes that open a saved post in the editor, so the
    authorship check can't drift between them: /posts/[id]/edit, and
    /posts/create?id=, which is where a new post lives after its first save in
    place (see SimpleEditor's savePost for why it doesn't move to /edit). */
export async function getOwnPostForEditing(postId: number, userId: string | undefined) {
  if (!Number.isFinite(postId) || !userId) return null;
  const post = await getPostById(postId);
  if (!post || post.post_author !== userId) return null;
  return post;
}
