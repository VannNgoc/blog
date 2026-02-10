// app/api/posts/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { PostRow } from "@/type/post";

export async function GET() {
    const rows = (await sql`
    SELECT *
    FROM posts
    ORDER BY post_date ASC
    `) as PostRow[];

    return NextResponse.json({ data: rows });
}