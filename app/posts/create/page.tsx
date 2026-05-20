import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import CreatePostForm from "@/ui/posts/CreatePostForm";

export default async function CreatePostPage() {
    const { data: session } = await auth.getSession();
    if (!session?.user) redirect("/auth/sign-in");
    return <CreatePostForm />;
}
