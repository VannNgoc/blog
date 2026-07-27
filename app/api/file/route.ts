import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { auth } from "@/lib/auth/server"
import { getPostById } from "@/lib/posts/queries"
import { postReferencesPathname } from "@/lib/tiptap-utils"

export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession()
  const userId = session?.user?.id

  const pathname = request.nextUrl.searchParams.get("pathname")
  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 })
  }

  // Case 1: the requester is the one who uploaded this file (pathname is
  // "posts/<uploaderId>/..."). Covers viewing your own image while still
  // composing a draft, before any post row exists to check access against.
  const [, ownerId] = pathname.split("/")
  const isOwner = !!userId && ownerId === userId

  // Public posts can be served from a shared/CDN cache once verified; any
  // other successful case (drafts, or a private post viewed by its author)
  // stays in the requester's own browser cache only.
  let isPublicPost = false

  if (!isOwner) {
    // Case 2: viewing an already-saved post. Requires the post to actually
    // embed this pathname (not just any postId the caller supplies), and the
    // same access rule used to gate the post page itself.
    const postId = Number(request.nextUrl.searchParams.get("postId"))
    const post = Number.isNaN(postId) ? undefined : await getPostById(postId)

    const canView = !!post && (post.access === 1 || post.post_author === userId)
    if (!canView || !postReferencesPathname(post!.post_body_json, pathname)) {
      return new NextResponse("Not found", { status: 404 })
    }
    isPublicPost = post!.access === 1
  }

  const result = await get(pathname, { access: "private" })
  if (result?.statusCode !== 200) {
    return new NextResponse("Not found", { status: 404 })
  }

  // Every upload gets a fresh UUID-prefixed pathname (see /api/upload), so a
  // given pathname's content never changes — safe to cache indefinitely once
  // access has been verified for this request. Previously this was
  // `private, no-cache`, forcing a fresh auth check + DB query + blob lookup
  // on every single image load, including scrolling back to a post you'd
  // already viewed — a major contributor to slow post-page LCP.
  const cacheControl = isPublicPost
    ? "public, max-age=31536000, immutable"
    : "private, max-age=31536000, immutable"

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": cacheControl,
    },
  })
}
