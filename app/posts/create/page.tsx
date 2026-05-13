"use client";
import { createPostHandler } from "@/lib/posts/actions";
import {
  createPostFormSchema,
  type CreatePostFormFields,
} from "@/schemas/post-form";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";


export default function CreatePostPage(){

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<CreatePostFormFields>({
        resolver: zodResolver(createPostFormSchema),
    });

    const onSubmit: SubmitHandler<CreatePostFormFields> = async (data) => {
        await createPostHandler(data);
    };
    return(
        <div className="container mx-auto p-4 text-zinc-900 dark:text-zinc-50">
            <h1 className="mb-8 text-4xl font-medium tracking-medium text-zinc-800 dark:text-zinc-100">Create a New Post</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
                <label htmlFor="title" className="sr-only">Title</label>
                <input 
                    id="title" 
                    type="text"
                    placeholder="Post Title" 
                    className="mb-4 w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-blue-500"
                    {...register("title")}
                />
                <label htmlFor="body" className="sr-only">Body</label>
                <textarea 
                    id="body"
                    placeholder="Post Content"
                    className="mb-4 h-40 w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-900 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-blue-500"
                    {...register("body")}
                />
                <input className="btn mb-2" type="submit" />
                {errors.title && <p className="text-red-600 dark:text-red-400">{errors.title.message}</p>}
                {errors.body && <p className="text-red-600 dark:text-red-400">{errors.body.message}</p>}
            </form>
        </div>
    )
}