export default function CreatePostPage(){
    return(
        <div className="container mx-auto p-4">
            <h1>Create a New Post</h1>
            <input type="text" placeholder="Post Title" className="border p-2 w-full mb-4"/>
            <textarea placeholder="Post Content" className="border p-2 w-full h-40 mb-4"></textarea>
            <button className="btn">Submit</button>
        </div>
    )
}