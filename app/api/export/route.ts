import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getUserPostsForExport } from "@/lib/posts/queries";
import { extractImagePathnames } from "@/lib/tiptap-utils";
import { ACCESS_DRAFT, ACCESS_PRIVATE, ACCESS_PUBLIC } from "@/lib/constants";
import { todayInSiteTimeZone } from "@/lib/dates";

const ACCESS_NAME: Record<number, string> = {
  [ACCESS_PUBLIC]: "public",
  [ACCESS_PRIVATE]: "private",
  [ACCESS_DRAFT]: "draft",
};

/** DATE columns arrive as UTC midnight; slicing the ISO string keeps the
    calendar day without a time zone shifting it. */
function calendarDay(date: Date | null) {
  return date ? new Date(date).toISOString().slice(0, 10) : null;
}

/**
 * Downloads everything the signed-in author has written as one JSON file.
 *
 * Bodies stay as Tiptap JSON, the format they're stored in, so nothing is lost
 * in conversion and the file could be imported back. Images are listed by
 * their storage path rather than embedded: bundling the files themselves
 * would turn a quick download into a large archive job.
 */
export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await getUserPostsForExport(session.user.id);
  const today = todayInSiteTimeZone();

  const body = {
    exportedOn: today,
    author: { name: session.user.name, email: session.user.email },
    posts: rows.map((post) => ({
      id: post.id,
      title: post.post_name,
      description: post.post_description ?? "",
      date: calendarDay(post.post_date),
      editedDate: calendarDay(post.post_edit_date),
      access: ACCESS_NAME[post.access] ?? String(post.access),
      images: extractImagePathnames(post.post_body_json),
      body: post.post_body_json,
    })),
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="recollections-${today}.json"`,
      // Private writing: never let a shared cache keep a copy.
      "Cache-Control": "private, no-store",
    },
  });
}
