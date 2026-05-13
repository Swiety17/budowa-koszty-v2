import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zbayzunxxqqbbzzzpovi.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'zbayzunxxqqbbzzzpovi.supabase.co',
        pathname: '/storage/v1/render/**',
      },
    ],
    formats: ['image/webp'],
  },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
