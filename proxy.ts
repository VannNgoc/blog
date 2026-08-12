import { auth } from '@/lib/auth/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const authMiddleware = auth.middleware({ loginUrl: '/auth/sign-in' });

const PROTECTED_PATTERNS = [
  /^\/account(?:\/|$)/,
  /^\/posts\/create$/,
  /^\/posts\/[^/]+\/edit$/,
  /^\/dashboard$/,
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
}

function buildCsp(nonce: string) {
  // Turbopack's dev server wraps every module in eval() (for fast,
  // inline-source-mapped HMR) — real, but dev-only plumbing, unrelated to
  // application code. Blocking eval() there doesn't stop an attack, it just
  // breaks the dev runtime, so it's allowed only outside production.
  const devEval = process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : '';

  return [
    "default-src 'self'",
    // 'strict-dynamic' + the nonce is what lets Next's own runtime-injected
    // chunk/hydration <script> tags execute: Next auto-detects the nonce
    // from this header and applies it to every inline script it generates
    // for this request, so nothing else in the app needs to know about it
    // except our one custom inline script in app/layout.tsx (via x-nonce below).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}`,
    "style-src 'self' 'unsafe-inline'", // Tailwind + per-element inline `style` attrs (view-transition names)
    "img-src 'self' data: blob:", // blob: for the client-side upload-dimension probe in lib/tiptap-utils.ts
    "font-src 'self'", // next/font self-hosts Geist under /_next/static
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export default async function middleware(request: NextRequest) {
  // Server Action requests handle auth themselves and render no HTML, so
  // neither the login-redirect check nor the nonce'd CSP header (which
  // only matters for documents) applies to them.
  if (request.headers.has('next-action')) {
    return;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  // Set before the auth check so it's already present on `request.headers`
  // when `authMiddleware` clones them into its own NextResponse.next() call.
  request.headers.set('x-nonce', nonce);

  const response = isProtectedPath(request.nextUrl.pathname)
    ? await authMiddleware(request)
    : NextResponse.next({ request: { headers: request.headers } });

  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};