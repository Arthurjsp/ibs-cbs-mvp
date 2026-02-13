/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  },
  transpilePackages: ["@mvp/shared", "@mvp/engine"]
};

export default nextConfig;

