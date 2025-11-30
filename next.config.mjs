import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // React严格模式，帮助发现潜在问题
  reactStrictMode: true,
  
  // 服务器外部包配置
  serverExternalPackages: ["@prisma/client"],
  
  // Webpack 配置
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '~': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './src'),
    };
    // 确保 framer-motion 被正确解析
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };
    return config;
  },
  
  // 转译包配置
  transpilePackages: ['framer-motion'],
  
  // 图片优化配置
  images: {
    // 允许的图片域名
    domains: [],
    // 图片格式
    formats: ["image/webp", "image/avif"],
  },
  
  // 环境变量配置
  env: {
    // 自定义环境变量可以在这里添加
  },
  
  // 重定向配置
  async redirects() {
    return [
      // 示例重定向
      // {
      //   source: '/old-path',
      //   destination: '/new-path',
      //   permanent: true,
      // },
    ];
  },
  
  // 重写配置
  async rewrites() {
    return [
      // 示例重写
      // {
      //   source: '/api/:path*',
      //   destination: '/api/:path*',
      // },
    ];
  },
  
  // 头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // 输出配置
  output: 'standalone',
  
  // 压缩配置
  compress: true,
  
  // 性能配置
  poweredByHeader: false,
  
  // 开发服务器配置
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;