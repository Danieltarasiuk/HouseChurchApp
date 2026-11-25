import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Old paths from before house churches were renamed to groups (PR 1.0).
  // Temporary (307) rather than permanent, so a rollback is not undone by
  // browsers that cached the redirect.
  async redirects() {
    return [
      { source: '/house-churches', destination: '/groups', permanent: false },
      { source: '/house-churches/:id', destination: '/groups/:id', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
