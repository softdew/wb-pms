import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Laravel API is a separate origin in development (localhost:8000).
  // All browser traffic goes through /api/proxy so the bearer token can stay
  // in an httpOnly cookie rather than in JavaScript's reach.
  experimental: { typedRoutes: true },
};

export default nextConfig;
