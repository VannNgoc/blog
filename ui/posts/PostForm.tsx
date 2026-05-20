"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createPostFormSchema,
  type CreatePostFormFields,
} from "@/schemas/post-form";
import Link from "next/link";

type PostFormProps = {
  heading: string;
  defaultValues: CreatePostFormFields;
  onSubmit: SubmitHandler<CreatePostFormFields>;
  cancelHref?: string;
};

export default function PostForm({
  heading,
  defaultValues,
  onSubmit,
  cancelHref,
}: PostFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePostFormFields>({
    resolver: zodResolver(createPostFormSchema),
    defaultValues,
  });

  return (
    <div className="container mx-auto p-4 text-zinc-900 dark:text-zinc-50">
      <h1 className="mb-8 text-4xl font-medium tracking-medium text-zinc-800 dark:text-zinc-100">
        {heading}
      </h1>
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
        <label htmlFor="access" className="mr-2">Access:</label>
        <select
          id="access"
          className="rounded-md border border-zinc-300 bg-white text-zinc-900 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-blue-500"
          {...register("access", { valueAsNumber: true })}
        >
          <option value={1}>Public</option>
          <option value={2}>Private</option>
        </select>
        <div className="my-4 flex gap-4">
          <input className="btn" type="submit" />
          {cancelHref && (
            <Link className="btn-cancel" href={cancelHref}>Cancel</Link>
          )}
        </div>
        {errors.title && (
          <p className="text-red-600 dark:text-red-400">{errors.title.message}</p>
        )}
        {errors.body && (
          <p className="text-red-600 dark:text-red-400">{errors.body.message}</p>
        )}
      </form>
    </div>
  );
}
