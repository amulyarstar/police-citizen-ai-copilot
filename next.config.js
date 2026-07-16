/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "pg"],
  },
};

module.exports = nextConfig;
