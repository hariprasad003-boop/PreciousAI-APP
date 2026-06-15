/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@preciousai/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'preciousai.app' },
    ],
  },
}

module.exports = nextConfig
