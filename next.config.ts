import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // The dashboard imports many icons: only the ones used end up in the bundle.
  experimental: { optimizePackageImports: ['lucide-react'] },
};
export default nextConfig;
