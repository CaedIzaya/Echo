#!/bin/bash
# ========================================
# Echo App - 安全部署脚本
# ========================================
# 自动同步代码，保护配置文件

set -e

DEPLOY_TMP="~/deploy_tmp/t3-app"
TARGET="~/apps/echo/t3-app"

echo "🚀 Echo App 安全部署"
echo "================================"
echo ""

# 0. 检查源目录
if [ ! -d "$DEPLOY_TMP" ]; then
  echo "❌ 错误：源目录不存在: $DEPLOY_TMP"
  exit 1
fi

# 1. 备份配置
echo "📦 步骤 1: 备份配置文件..."
if [ -f "$TARGET/.env" ]; then
  cp "$TARGET/.env" ~/apps/echo/.env-backup-$(date +%Y%m%d-%H%M%S)
  echo "✅ .env 已备份"
else
  echo "⚠️  警告：目标目录没有 .env 文件"
fi

# 2. 停止应用
echo ""
echo "⏸️  步骤 2: 停止应用..."
pm2 stop echo-app || echo "应用未运行"

# 3. 同步源代码（--delete 删除目标目录中不存在于源的文件）
echo ""
echo "📂 步骤 3: 同步源代码..."
rsync -av --progress --delete ${DEPLOY_TMP}/src/ ${TARGET}/src/
echo "✅ src/ 已同步"

# 4. 同步数据库配置
echo ""
echo "🗄️  步骤 4: 同步数据库配置..."
rsync -av --progress --delete ${DEPLOY_TMP}/prisma/ ${TARGET}/prisma/
echo "✅ prisma/ 已同步"

# 5. 同步静态资源
echo ""
echo "🖼️  步骤 5: 同步静态资源..."
rsync -av --progress --delete ${DEPLOY_TMP}/public/ ${TARGET}/public/
echo "✅ public/ 已同步"

# 6. 同步配置文件
echo ""
echo "⚙️  步骤 6: 同步配置文件..."
rsync -av --progress ${DEPLOY_TMP}/package.json ${TARGET}/
rsync -av --progress ${DEPLOY_TMP}/next.config.mjs ${TARGET}/
rsync -av --progress ${DEPLOY_TMP}/tsconfig.json ${TARGET}/
rsync -av --progress ${DEPLOY_TMP}/tailwind.config.ts ${TARGET}/
rsync -av --progress ${DEPLOY_TMP}/postcss.config.js ${TARGET}/
echo "✅ 配置文件已同步"

# 7. 同步工具配置（可选）
echo ""
echo "🛠️  步骤 7: 同步工具配置..."
rsync -av --progress ${DEPLOY_TMP}/.gitignore ${TARGET}/
rsync -av --progress ${DEPLOY_TMP}/.cursorignore ${TARGET}/ 2>/dev/null || true
rsync -av --progress ${DEPLOY_TMP}/.watchmanconfig ${TARGET}/ 2>/dev/null || true
echo "✅ 工具配置已同步"

# 8. 同步脚本目录
echo ""
echo "📜 步骤 8: 同步维护脚本..."
rsync -av --progress --delete ${DEPLOY_TMP}/scripts/ ${TARGET}/scripts/
echo "✅ scripts/ 已同步"

# 9. 恢复 .env
echo ""
echo "🔧 步骤 9: 恢复配置文件..."
if [ -f ~/apps/echo/.env-backup-* ]; then
  LATEST_BACKUP=$(ls -t ~/apps/echo/.env-backup-* | head -1)
  cp "$LATEST_BACKUP" ${TARGET}/.env
  echo "✅ .env 已恢复: $(basename $LATEST_BACKUP)"
else
  echo "❌ 错误：找不到备份的 .env 文件"
  echo "请手动创建 .env 文件"
  exit 1
fi

# 10. 安装依赖
echo ""
echo "📦 步骤 10: 安装依赖..."
cd ${TARGET}
npm ci --only=production
echo "✅ 依赖已安装"

# 11. 生成 Prisma Client
echo ""
echo "🔄 步骤 11: 生成 Prisma Client..."
npx prisma generate
echo "✅ Prisma Client 已生成"

# 12. 构建应用
echo ""
echo "🏗️  步骤 12: 构建应用..."
npm run build
echo "✅ 应用已构建"

# 13. 重启应用
echo ""
echo "🚀 步骤 13: 重启应用..."
pm2 restart echo-app
pm2 save
echo "✅ 应用已重启"

# 14. 显示状态
echo ""
echo "================================"
echo "✅ 部署完成！"
echo "================================"
echo ""
pm2 status echo-app
echo ""
echo "📊 查看日志:"
echo "  pm2 logs echo-app"
echo ""
echo "🌐 访问应用:"
echo "  https://echoo.xin"
echo ""

