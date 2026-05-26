import { auth } from '@/lib/auth/server';
import type { NextRequest } from 'next/server';

const authMiddleware = auth.middleware({ loginUrl: '/auth/sign-in' });

// Skip auth middleware for Server Action requests — they handle auth themselves.
export default function middleware(request: NextRequest) {
  if (request.headers.has('next-action')) {
    return;
  }
  return authMiddleware(request);
}

export const config = {
  matcher: [
    '/account/:path*',
    '/posts/create',
    '/posts/:id/edit',
  ],
};