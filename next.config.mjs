import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // React严格模式，帮助发现潜在问题
  reactStrictMode: true,
  
  // Fast Refresh 配置
  onDemandEntries: {
    // 页面在内存中保留的最长时间（毫秒）
    maxInactiveAge: 25 * 1000,
    // 同时保留的页面数
    pagesBufferLength: 2,
  },
  
  // 服务器外部包配置
  serverExternalPackages: ["@prisma/client"],
  
  // Webpack 配置
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '~': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './src'),
    };
    // 确保 framer-motion 被正确解析
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };
    
    // 配置文件监听选项，忽略 Windows 系统文件和不必要的目录
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          // Node modules and git
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/out/**',
          '**/build/**',
          '**/dist/**',
          
          // Prisma database files
          '**/prisma/dev.db',
          '**/prisma/**/*.db',
          '**/prisma/**/*.db-journal',
          
          // Public folder nested projects (防止扫描嵌套项目)
          '**/public/**/node_modules/**',
          '**/public/**/.next/**',
          '**/public/**/package.json',
          
          // Windows 系统文件 (绝对路径)
          'C:/DumpStack.log.tmp',
          'C:/hiberfil.sys',
          'C:/pagefile.sys',
          'C:/swapfile.sys',
          
          // Windows 系统文件 (通配符模式)
          '**/C:/DumpStack.log.tmp',
          '**/C:/hiberfil.sys',
          '**/C:/pagefile.sys',
          '**/C:/swapfile.sys',
          
          // 临时文件
          '**/*.tmp',
          '**/*.temp',
          '**/.cache/**',
        ],
        // 使用轮询可以避免某些文件系统事件问题，但会消耗更多资源
        // 在 Windows 上，如果遇到问题可以设置为 true
        poll: false,
        // 减少轮询间隔（如果启用轮询）
        aggregateTimeout: 300,
      };
    }
    
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
  
  // 开发服务器配置（关闭 Next.js DevTools 浮标）
  devIndicators: false,
};

export default nextConfig;
