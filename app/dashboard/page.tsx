import {getUserPosts} from "@/lib/posts/queries";
import { PostCard } from "@/ui/posts/PostCard";
import { CreatePostButton } from "@/ui/posts/createPostButton";
import { auth } from '@/lib/auth/server';

export default async function Dashbaord() {
  const { data: session } = await auth.getSession();
  let posts = session?.user ? await getUserPosts(session.user.id): []
  
  return (
    <main className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Posts</h1>
      {session?.user && <CreatePostButton/>}
      <ul className="space-y-4 mt-6">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} isAuthor={p.post_author === session?.user.id}/>
        ))}
      </ul>
    </main>
  );
}
