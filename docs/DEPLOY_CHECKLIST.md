# 📋 ECS 部署文件清单

## ✅ 你的命令（当前）

```bash
rsync -av --progress ~/deploy_tmp/t3-app/src/    ~/apps/echo/t3-app/src/
rsync -av --progress ~/deploy_tmp/t3-app/prisma/ ~/apps/echo/t3-app/prisma/
rsync -av --progress ~/deploy_tmp/t3-app/public/ ~/apps/echo/t3-app/public/
rsync -av --progress ~/deploy_tmp/t3-app/package.json ~/apps/echo/t3-app/package.json
```

## ⚠️ 遗漏的关键文件

### 🔴 必须添加（否则功能异常）

```bash
# 1. Next.js 配置（包含今天的修复！）
rsync -av --progress ~/deploy_tmp/t3-app/next.config.mjs ~/apps/echo/t3-app/

# 2. TypeScript 配置
rsync -av --progress ~/deploy_tmp/t3-app/tsconfig.json ~/apps/echo/t3-app/

# 3. Tailwind 配置
rsync -av --progress ~/deploy_tmp/t3-app/tailwind.config.ts ~/apps/echo/t3-app/

# 4. PostCSS 配置
rsync -av --progress ~/deploy_tmp/t3-app/postcss.config.js ~/apps/echo/t3-app/
```

### 🟡 建议添加（最佳实践）

```bash
# 5. Git 配置
rsync -av --progress ~/deploy_tmp/t3-app/.gitignore ~/apps/echo/t3-app/

# 6. 文件监视配置
rsync -av --progress ~/deploy_tmp/t3-app/.cursorignore ~/apps/echo/t3-app/ 2>/dev/null || true
rsync -av --progress ~/deploy_tmp/t3-app/.watchmanconfig ~/apps/echo/t3-app/ 2>/dev/null || true

# 7. 维护脚本
rsync -av --progress --delete ~/deploy_tmp/t3-app/scripts/ ~/apps/echo/t3-app/scripts/
```

---

## 🎯 完整推荐命令

### 方式 1: 逐个文件（安全）

```bash
#!/bin/bash
# 完整的同步命令

# 备份配置
cp ~/apps/echo/t3-app/.env ~/apps/echo/.env-backup

# 同步目录
rsync -av --progress --delete ~/deploy_tmp/t3-app/src/     ~/apps/echo/t3-app/src/
rsync -av --progress --delete ~/deploy_tmp/t3-app/prisma/  ~/apps/echo/t3-app/prisma/
rsync -av --progress --delete ~/deploy_tmp/t3-app/public/  ~/apps/echo/t3-app/public/
rsync -av --progress --delete ~/deploy_tmp/t3-app/scripts/ ~/apps/echo/t3-app/scripts/

# 同步配置文件
rsync -av --progress ~/deploy_tmp/t3-app/package.json      ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/next.config.mjs   ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/tsconfig.json     ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/tailwind.config.ts ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/postcss.config.js ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/.gitignore        ~/apps/echo/t3-app/

# 恢复 .env
cp ~/apps/echo/.env-backup ~/apps/echo/t3-app/.env

# 重新构建
cd ~/apps/echo/t3-app
npm ci --only=production
npx prisma generate
npm run build
pm2 restart echo-app
```

### 方式 2: 整个目录（简单但小心）

```bash
#!/bin/bash
# 简化的同步命令（排除 .env 和 node_modules）

# 备份
cp ~/apps/echo/t3-app/.env ~/apps/echo/.env-backup

# 同步整个目录（排除不需要的）
rsync -av --progress --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.log' \
  --exclude='*.db' \
  ~/deploy_tmp/t3-app/ ~/apps/echo/t3-app/

# 恢复 .env
cp ~/apps/echo/.env-backup ~/apps/echo/t3-app/.env

# 构建
cd ~/apps/echo/t3-app
npm ci --only=production
npx prisma generate
npm run build
pm2 restart echo-app
```

---

## 🚨 今天修改的关键文件

### 根目录配置文件（今天修改）

| 文件 | 修改内容 | 必须同步 |
|------|---------|---------|
| `next.config.mjs` | watchOptions, onDemandEntries | 🔴 **是** |
| `package.json` | @types/react 版本 | 🔴 **是** |
| `.gitignore` | 防止嵌套项目 | 🟡 建议 |
| `.cursorignore` | 新建 | 🟡 建议 |
| `.watchmanconfig` | 新建 | 🟡 建议 |

### src/ 目录（今天修改）

- ✅ `src/hooks/useUserExp.ts` - 用户隔离
- ✅ `src/hooks/useUserStats.ts` - 用户隔离
- ✅ `src/hooks/useHeartTreeExp.ts` - 用户隔离
- ✅ `src/hooks/useHeartTreeName.ts` - 用户隔离
- ✅ `src/hooks/useAchievements.ts` - 用户隔离
- ✅ `src/hooks/useProjects.ts` - 用户隔离
- ✅ `src/hooks/useDashboardData.ts` - 用户隔离
- ✅ `src/hooks/useSmartDataSync.ts` - 用户隔离
- ✅ `src/hooks/useDataSync.ts` - 用户隔离
- ✅ `src/lib/HeartTreeExpSystem.ts` - 底层存储
- ✅ `src/lib/DataIntegritySystem.ts` - 数据完整性
- ✅ `src/pages/auth/signin.tsx` - 登录清理
- ✅ `src/pages/dashboard/index.tsx` - Dashboard设置
- ✅ `src/pages/index.tsx` - 首页优化
- ✅ `src/pages/profile/index.tsx` - 个人资料
- ✅ `src/constants/landing.ts` - 新建常量文件

**所有这些都在 src/ 下，你的命令已包含** ✅

---

## 🎯 最小必须命令（修正版）

```bash
# 备份配置
cp ~/apps/echo/t3-app/.env ~/apps/echo/.env-backup

# 同步代码和资源
rsync -av --progress --delete ~/deploy_tmp/t3-app/src/    ~/apps/echo/t3-app/src/
rsync -av --progress --delete ~/deploy_tmp/t3-app/prisma/ ~/apps/echo/t3-app/prisma/
rsync -av --progress --delete ~/deploy_tmp/t3-app/public/ ~/apps/echo/t3-app/public/

# 同步配置文件（关键！）
rsync -av --progress ~/deploy_tmp/t3-app/package.json     ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/next.config.mjs  ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/tsconfig.json    ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/tailwind.config.ts ~/apps/echo/t3-app/
rsync -av --progress ~/deploy_tmp/t3-app/postcss.config.js ~/apps/echo/t3-app/

# 恢复 .env
cp ~/apps/echo/.env-backup ~/apps/echo/t3-app/.env

# 重新构建和启动
cd ~/apps/echo/t3-app
npm ci --only=production
npx prisma generate
npm run build
pm2 restart echo-app
```

---

## 📊 对比

### 你的原命令：4行

```bash
rsync src/
rsync prisma/
rsync public/
rsync package.json
```

### 推荐命令：9行（最小）

```bash
rsync src/
rsync prisma/
rsync public/
rsync package.json
rsync next.config.mjs     # ← 新增
rsync tsconfig.json       # ← 新增
rsync tailwind.config.ts  # ← 新增
rsync postcss.config.js   # ← 新增
+ 备份和恢复 .env
```

---

## 🎯 结论

**你的命令不够！** 至少需要添加：

### 🔴 必须添加（4个文件）
1. `next.config.mjs` - 包含今天的 Watchpack 修复
2. `tsconfig.json` - TypeScript 配置
3. `tailwind.config.ts` - 样式配置
4. `postcss.config.js` - PostCSS 配置

### 🟡 建议添加
5. `scripts/` - 维护脚本
6. `.gitignore` - Git 配置

---

**完整脚本**: `safe-deploy.sh` 已创建

**快速参考**: 本文档（`DEPLOY_CHECKLIST.md`）

**现在部署不会遗漏文件了！** ✅

