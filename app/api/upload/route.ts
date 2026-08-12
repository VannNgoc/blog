import { put } from "@vercel/blob"
import { auth } from "@/lib/auth/server"
import { NextResponse } from "next/server"
import { isRateLimited } from "@/lib/rate-limit"

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

  const blob = await put(`posts/${session.user.id}/${crypto.randomUUID()}-${file.name}`, file, {
    access: "private",
    contentType: file.type,
  })
  
  return NextResponse.json({ url: `/api/file?pathname=${encodeURIComponent(blob.pathname)}` })
}