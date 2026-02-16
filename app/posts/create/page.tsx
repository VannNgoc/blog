import { createPostHandler } from "./actions";

export default function CreatePostPage(){
    return(
        <div className="container mx-auto p-4">
            <h1 className="mb-8 text-4xl font-medium tracking-medium text-zinc-800 dark:text-zinc-200">Create a New Post</h1>
            <form action={createPostHandler}>
                <input name="title" type="text" placeholder="Post Title" className="border p-2 w-full mb-4"/>
                <textarea name="body" placeholder="Post Content" className="border p-2 w-full h-40 mb-4"></textarea>
                <button className="btn">Submit</button>
            </form>
        </div>
    )
}