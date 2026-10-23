import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // data/ holds real user data at runtime; never bundle it into the server output
  outputFileTracingExcludes: { '*': ['data/**'] },
};

export default nextConfig;
