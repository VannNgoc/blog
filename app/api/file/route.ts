import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { auth } from "@/lib/auth/server"
import { getPostById } from "@/lib/posts/queries"
import { postReferencesPathname } from "@/lib/tiptap-utils"
import { ACCESS_PUBLIC } from "@/lib/constants"

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname")
  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 })
  }

  // Resolve the post first, before touching the session. Every image on a page
  // is its own request to this route, and `auth.getSession()` is a real
  // network round trip (this SDK validates server-side rather than decoding a
  // cookie) — so calling it up front charged that round trip to every image,
  // including the ones where the answer can't depend on who is asking.
  const postId = Number(request.nextUrl.searchParams.get("postId"))
  const post = Number.isNaN(postId) ? undefined : await getPostById(postId)

  // The post must actually embed this pathname — not just any postId the
  // caller pairs with it.
  const referencesPathname =
    !!post && postReferencesPathname(post.post_body_json, pathname)

  // A public post's image is viewable by anyone, so the requester's identity
  // is irrelevant and the session round trip can be skipped entirely. This is
  // also the only branch whose response is safe in a shared/CDN cache.
  const isPublicPost = referencesPathname && post!.access === ACCESS_PUBLIC

  if (!isPublicPost) {
    const { data: session } = await auth.getSession()
    const userId = session?.user?.id

    // Case 1: the requester uploaded this file (pathname is
    // "posts/<uploaderId>/..."). Covers viewing your own image while still
    // composing a draft, before any post row exists to check access against.
    const [, ownerId] = pathname.split("/")
    const isOwner = !!userId && ownerId === userId

    if (!isOwner) {
      // Case 2: a private post, viewable only by its author. The public case
      // is already handled above, so authorship is all that's left to check.
      const canView = referencesPathname && post!.post_author === userId
      if (!canView) {
        return new NextResponse("Not found", { status: 404 })
      }
    }
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
    ? "public, max-age=31536000, s-maxage=31536000, immutable"
    : "private, max-age=31536000, immutable"

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": cacheControl,
    },
  })
}
