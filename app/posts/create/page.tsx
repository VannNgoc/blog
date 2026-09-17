import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getOwnPostForEditing } from "@/lib/posts/editing";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

export default async function CreatePostPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
    const { data: session } = await getSession();
    if (!session?.user) redirect("/auth/sign-in");

    // A new post that has been saved in place keeps this URL with its id
    // added, so reloading reopens it instead of starting a blank one. Both
    // branches render SimpleEditor in the same position, which is what lets
    // React keep the editor mounted when a save refreshes this page.
    const { id } = await searchParams;
    if (id === undefined) return <SimpleEditor />;

    const post = await getOwnPostForEditing(Number(id), session.user.id);
    if (!post) notFound();
    return (
      <SimpleEditor
        postId={post.id}
        initialContent={post.post_body_json}
        initialTitle={post.post_name}
        initialDescription={post.post_description ?? ""}
        initialAccess={post.access}
      />
    );
}
