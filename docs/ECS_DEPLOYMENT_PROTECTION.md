#!/bin/bash
# ========================================
# Echo App - ECS 安全部署脚本
# ========================================

set -e

SERVER_IP="121.43.158.122"
SERVER_USER="root"
SERVER_PATH="/root"
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

echo "🚀 Echo App ECS 部署工具"
echo "================================"
echo ""

# 1. 备份服务器配置
echo "📦 步骤 1: 备份服务器配置..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root
if [ -f "t3-app/.env" ]; then
  cp t3-app/.env .env-backup-$(date +%Y%m%d-%H%M%S)
  echo "✅ .env 已备份"
else
  echo "⚠️  服务器上没有 .env 文件"
fi
EOF

# 2. 停止应用
echo ""
echo "⏸️  步骤 2: 停止应用..."
ssh ${SERVER_USER}@${SERVER_IP} "pm2 stop echo-app || true"

# 3. 备份旧版本
echo ""
echo "📦 步骤 3: 备份旧版本..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root
if [ -d "t3-app" ]; then
  rm -rf t3-app-old
  mv t3-app t3-app-old
  echo "✅ 旧版本已备份到 t3-app-old"
fi
EOF

# 4. 解压新版本
echo ""
echo "📦 步骤 4: 部署新版本..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root
tar -xzf echo.tar.gz
echo "✅ 新版本已解压"
EOF

# 5. 恢复配置文件
echo ""
echo "🔧 步骤 5: 恢复配置文件..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root
if [ -f "t3-app-old/.env" ]; then
  cp t3-app-old/.env t3-app/.env
  echo "✅ .env 已恢复"
else
  echo "❌ 警告：旧版本没有 .env 文件！"
  echo "请手动创建 .env 文件"
  exit 1
fi
EOF

# 6. 安装依赖
echo ""
echo "📦 步骤 6: 安装依赖..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root/t3-app
npm ci --only=production
npx prisma generate
echo "✅ 依赖安装完成"
EOF

# 7. 构建应用
echo ""
echo "🏗️  步骤 7: 构建应用..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root/t3-app
npm run build
echo "✅ 构建完成"
EOF

# 8. 重启应用
echo ""
echo "🚀 步骤 8: 重启应用..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root/t3-app
pm2 restart echo-app
pm2 save
echo "✅ 应用已重启"
EOF

# 9. 验证部署
echo ""
echo "🔍 步骤 9: 验证部署..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
pm2 status echo-app
echo ""
echo "查看日志（按 Ctrl+C 退出）："
pm2 logs echo-app --lines 20
EOF

echo ""
echo "================================"
echo "✅ 部署完成！"
echo "================================"
echo ""
echo "📋 后续操作："
echo "  - 访问: https://echoo.xin"
echo "  - 测试注册和登录功能"
echo "  - 检查数据库数据"
echo ""

