#!/bin/bash
# ========================================
# Echo App - 服务器快速配置脚本
# ========================================

set -e

echo "🚀 Echo App - 服务器配置向导"
echo "================================"
echo ""

# 获取服务器 IP
echo "📡 检测服务器 IP 地址..."
SERVER_IP=$(curl -s ifconfig.me || curl -s ip.sb || curl -s ipinfo.io/ip)
echo "✅ 服务器 IP: $SERVER_IP"
echo ""
echo "⚠️  请将此 IP 添加到阿里云 RDS 白名单！"
echo "   控制台: https://rdsnext.console.aliyun.com/"
echo "   实例: pgm-bp195rs24s2476mydo"
echo "   数据安全性 → 白名单设置 → 添加: $SERVER_IP/32"
echo ""

read -p "已添加白名单？按 Enter 继续..."
echo ""

# 输入域名
read -p "请输入你的域名（例: echo.example.com）: " DOMAIN
if [ -z "$DOMAIN" ]; then
  DOMAIN="http://localhost:3000"
  echo "⚠️  未设置域名，使用默认: $DOMAIN"
fi

# 创建 .env 文件
echo ""
echo "📝 创建 .env 文件..."

cat > .env << EOF
# ========================================
# Echo App - 生产环境配置
# ========================================
# 自动生成于: $(date '+%Y-%m-%d %H:%M:%S')

# 数据库配置 - 阿里云 PostgreSQL
DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public&sslmode=require&connection_limit=10&pool_timeout=20"

# NextAuth.js 配置
NEXTAUTH_SECRET="Apw2acnT7u81F3mYRcHHo1bVG18sNMOlqEfhwAYpxPw="
NEXTAUTH_URL="https://$DOMAIN"

# 应用配置
NODE_ENV="production"
LOG_LEVEL="info"
EOF

chmod 600 .env
echo "✅ .env 文件已创建"
echo ""

# 测试数据库连接
echo "🔍 测试数据库连接..."
if command -v node &> /dev/null; then
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.\$queryRaw\`SELECT current_database(), current_user\`
      .then(result => {
        console.log('✅ 数据库连接成功!');
        console.log('   数据库:', result[0].current_database);
        console.log('   用户:', result[0].current_user);
        return prisma.\$disconnect();
      })
      .catch(err => {
        console.error('❌ 连接失败:', err.message);
        console.log('');
        console.log('请检查:');
        console.log('  1. 阿里云白名单是否包含 $SERVER_IP');
        console.log('  2. 网络连接是否正常');
        console.log('  3. 防火墙是否允许出站 5432 端口');
        process.exit(1);
      });
  " 2>/dev/null || {
    echo "⚠️  Node.js 未安装或 Prisma Client 未生成"
    echo "   请先运行: npm ci && npx prisma generate"
  }
else
  echo "⚠️  Node.js 未安装，跳过连接测试"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 配置完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 下一步操作："
echo "  1. 安装依赖: npm ci --only=production"
echo "  2. 生成 Prisma Client: npx prisma generate"
echo "  3. 构建应用: npm run build"
echo "  4. 启动应用: npm start"
echo ""
echo "或使用 PM2："
echo "  pm2 start npm --name echo-app -- start"
echo "  pm2 startup"
echo "  pm2 save"
echo ""
echo "================================"

