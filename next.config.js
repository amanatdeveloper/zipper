/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  // Cloudflare Workers has no Node image optimizer process; the only images
  // used by the app are static logos, so serve them as-is.
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
