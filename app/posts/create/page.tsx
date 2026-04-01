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
        <div className="container mx-auto p-4">
            <h1 className="mb-8 text-4xl font-medium tracking-medium text-zinc-800 dark:text-zinc-200">Create a New Post</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
                <label htmlFor="title"></label>
                <input 
                    id="title" 
                    type="text"
                    placeholder="Post Title" 
                    className="border p-2 w-full mb-4"
                    {...register("title")}
                />
                <label htmlFor="body"></label>
                <textarea 
                    id="body"
                    placeholder="Post Content"
                    className="border p-2 w-full h-40 mb-4"
                    {...register("body")}
                />
                <input className="btn mb-2" type="submit" />
                {errors.title && <p className="text-red-500">{errors.title.message}</p>}
                {errors.body && <p className="text-red-500">{errors.body.message}</p>}
            </form>
        </div>
    )
}