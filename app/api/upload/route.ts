import { put } from "@vercel/blob"
import { auth } from "@/lib/auth/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { data: session } = await auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
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