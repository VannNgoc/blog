import { NextResponse } from "next/server";
import { list, del } from "@vercel/blob";
import { getAllPostBodies } from "@/lib/posts/queries";
import { extractImagePathnames } from "@/lib/tiptap-utils";

// Images get uploaded to blob storage the moment they're dropped into the
// editor, before the post is ever saved (see /api/upload). A blob only
// becomes "referenced" once its post is saved with that image still in the
// body. Anything younger than this is left alone so we don't race an
// in-flight compose/save and delete an image that's about to be referenced.
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

// Vercel's documented pattern for securing cron routes: it calls this URL
// with this header set from CRON_SECRET automatically, so any other caller
// without the matching secret is rejected.
function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await getAllPostBodies();
  const referenced = new Set<string>();
  for (const post of posts) {
    for (const pathname of extractImagePathnames(post.post_body_json)) {
      referenced.add(pathname);
    }
  }

  const cutoff = Date.now() - GRACE_PERIOD_MS;
  const toDelete: string[] = [];
  let scanned = 0;
  let cursor: string | undefined;

  do {
    const result = await list({ prefix: "posts/", mode: "expanded", cursor, limit: 1000 });
    scanned += result.blobs.length;

    for (const blob of result.blobs) {
      if (!referenced.has(blob.pathname) && blob.uploadedAt.getTime() < cutoff) {
        toDelete.push(blob.pathname);
      }
    }

    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  // del() accepts an array, but keep batches modest so one bad pathname
  // can't blow up the whole run.
  const BATCH_SIZE = 100;
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    await del(toDelete.slice(i, i + BATCH_SIZE));
  }

  return NextResponse.json({
    scanned,
    referenced: referenced.size,
    deleted: toDelete.length,
  });
}
