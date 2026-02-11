'use server'
import { NewPostInput } from "@/type/post";
import { createPost } from "@/lib/posts";
import { redirect } from "next/navigation";

export async function createPostHandler(data: FormData){
    const post_name = data.get("title") as string;
    const post_body = data.get("body") as string;
    const postData: NewPostInput = {
        post_name: post_name,
        post_author: "John Doe", // You can replace this with dynamic user data
        post_body: post_body,
    }
    await createPost(postData);
    redirect("/posts");
}