import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

export default async function CreatePostPage() {
    const { data: session } = await auth.getSession();
    if (!session?.user) redirect("/auth/sign-in");
    return <SimpleEditor />;
}
