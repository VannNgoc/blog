import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth/server";

/**
 * The signed-in session, looked up at most once per request.
 *
 * `auth.getSession()` is a real network round trip (this SDK validates the
 * session server-side rather than decoding a cookie). A post page used to pay
 * it three times — the header, `generateMetadata`, and the page body each
 * asked separately. React's `cache()` shares one result across every server
 * component in the same render.
 *
 * Only for Server Components. Route handlers and server actions aren't part of
 * a render, so `cache()` wouldn't dedupe anything there — they keep calling
 * `auth.getSession()` directly.
 */
export const getSession = cache(() => auth.getSession());
