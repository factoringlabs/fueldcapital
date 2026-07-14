/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fueled-capital/shared'],
  // Self-contained server bundle for the ECS Fargate container — see apps/web/Dockerfile.
  output: 'standalone',
};

export default nextConfig;
