import { auth } from '@/lib/auth/server';

export default auth.middleware({
  // Redirects unauthenticated users to sign-in page
  loginUrl: '/auth/sign-in',
});

export const config = {
  matcher: [
    // Protected routes requiring authentication
    '/account/:path*',
    '/posts/create/:path*',
    '/posts/:id/edit/:path*',
    '/posts/:id/delete/:path*',
    '/posts/:id/view/:path*',
    '/posts/:id/comment/:path*',
    '/posts/:id/like/:path*',
    '/posts/:id/share/:path*',
    '/posts/:id/save/:path*',
  ],
};