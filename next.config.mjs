/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker multi-stage build
  output: "standalone",
};

export default nextConfig;