/** @type {import('next').NextConfig} */
const nextConfig = {
  // typedRoutes 等 Stage 2 路由稳定后再开启
  experimental: {
    typedRoutes: false,
    serverActions: {
      // 材料上传需要更大的 body 限制（默认 1MB）
      bodySizeLimit: "25mb"
    }
  }
};

export default nextConfig;
