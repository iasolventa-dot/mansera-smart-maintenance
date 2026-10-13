/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los paquetes del monorepo se publican como TypeScript fuente.
  transpilePackages: ["@msm/core", "@msm/ui"],
};
export default nextConfig;
