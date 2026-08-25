import { put } from "@vercel/blob"
import { auth } from "@/lib/auth/server"
import { NextResponse } from "next/server"
import { isRateLimited } from "@/lib/rate-limit"
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants"

const UPLOAD_LIMIT = 30
const UPLOAD_WINDOW_MS = 10 * 60 * 1000

export async function POST(request: Request) {
  const { data: session } = await auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (isRateLimited(`upload:${session.user.id}`, UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 })
  }

  const form = await request.formData()
  const file = form.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // `file.type` is whatever the browser claimed. Storing it unchecked meant an
  // authenticated user could keep a text/html blob here and have /api/file hand
  // it back same-origin — script execution on this domain, not an image.
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, AVIF and GIF images can be uploaded." },
      { status: 415 },
    )
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Images must be under ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 },
    )
  }

  // The filename is attacker-controlled and the stored path is security-
  // relevant — ownership is derived by splitting it (see /api/file) — so strip
  // separators and control characters and bound the length. The UUID prefix
  // already guarantees uniqueness; the original name is only for readability.
  const safeName = file.name
    .replace(/[^\w.\-]+/g, "_")
    // Collapse dot runs as well as separators. `..` can't traverse without a
    // "/" and the checks above already remove those, but storage backends
    // normalise paths differently and this costs nothing to rule out.
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "")
    .slice(-96) || "upload"

  const blob = await put(`posts/${session.user.id}/${crypto.randomUUID()}-${safeName}`, file, {
    access: "private",
    contentType: file.type,
  })
  
  return NextResponse.json({ url: `/api/file?pathname=${encodeURIComponent(blob.pathname)}` })
}