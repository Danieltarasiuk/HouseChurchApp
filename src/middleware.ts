import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/discipleship/:path*',
    '/incubator/:path*',
    '/house-churches/:path*',
    '/members/:path*',
    '/attendance/:path*',
    '/prayer/:path*',
  ],
};
