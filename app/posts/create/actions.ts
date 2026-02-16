'use server'
import { NewPostInput } from "@/type/post";
import { createPost } from "@/lib/posts";
import { redirect } from "next/navigation";

export async function createPostHandler(data: FormData){
    const post_name = data.get("title") as string;
    const post_body = data.get("body") as string;
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // Months are zero-based
    const day = d.getDate();
    const post_date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` // Create a Date object with the current date
    console.log(post_date);
    const postData: NewPostInput = {
        post_name: post_name,
        post_author: "John Doe", // You can replace this with dynamic user data
        post_body: post_body,
        post_date: post_date
    }
    await createPost(postData);
    redirect("/posts");
}