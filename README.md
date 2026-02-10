# Echo - 数字静默专注应用

基于 **Next.js 15 + React 19 + TypeScript + Prisma + NextAuth** 的全栈专注管理应用。

## ⚠️ 法律声明

**该产品禁止任何形式的传播和私用，本产品已公安和ICP备案，违者将依法追究法律责任。**

---

## 📋 项目简介

Echo 是一款专注管理应用，帮助用户培养专注习惯、记录成长轨迹，通过温柔的方式看见自己的节奏，建立可持续的专注习惯。

### ✨ 核心功能

- 🎯 专注计时（番茄钟、心流指数）
- 📊 数据看板（统计、连续天数、成就）
- 📝 每日小结（回顾总结）
- 📔 日记系统（历史记录）
- 🌳 心树系统（成长、开花动画）
- 📋 计划管理（主要计划、里程碑）
- 📧 邮件系统（周报、成就通知）
- ✨ Lumi 小精灵（智能对话、觉察引擎）

---

## 🧱 技术栈

- Next.js 15.5.9 / React 19 / TypeScript
- Prisma ORM / PostgreSQL 或 SQLite
- NextAuth.js / TailwindCSS / Framer Motion

---

## 🚀 快速开始（本地开发）

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量（不提交 .env）

- 参考模板：`env.production.example`
- 变量校验：`@t3-oss/env-nextjs`

本地开发可使用 SQLite：

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-random-secret-key-at-least-32-characters-long"
NEXTAUTH_URL="http://localhost:3001"
```

### 3) 初始化数据库

```bash
npx prisma generate
npm run db:push
```

### 4) 启动开发服务器

```bash
npm run dev
```

默认端口：`http://localhost:3001`

---

## 🧪 常用命令

```bash
npm run build      # 生产构建
npm run start      # 生产启动
npm run typecheck  # 类型检查
npm run db:migrate # 生产迁移
```

---

## 📁 目录结构（核心）

```
.
├─ prisma/            # Prisma schema & migrations
├─ public/            # 静态资源
├─ scripts/           # 数据校验/同步/清理脚本
├─ docs/              # 产品/架构文档
└─ src/
   ├─ pages/          # Next.js Pages Router（页面 + API）
   ├─ components/     # 跨页面复用组件
   ├─ hooks/          # 客户端 Hooks
   ├─ lib/            # 核心业务逻辑
   ├─ server/         # 服务端工具（db/auth）
   ├─ awareness/      # 觉察/规则引擎
   └─ styles/         # 全局样式
```

---

## 🔍 关键代码入口

- Dashboard：`src/pages/dashboard/index.tsx`
- 专注主流程：`src/pages/focus/index.tsx`
- 成就/等级/心流：`src/lib/AchievementSystem.tsx`、`src/lib/LevelSystem.tsx`、`src/lib/flowEngine.ts`
- 数据同步：`src/hooks/useSmartDataSync.ts`、`src/lib/dataSync/strategy.ts`
- API & 模型：`src/pages/api/*`、`prisma/schema.prisma`

---

## 🔒 安全与合规

- 不包含任何 `.env` 或密钥文件
- 所有 API 需 Session 校验
- Prisma ORM 防注入，用户数据按 `userId` 隔离

---

## 📖 相关文档

- 架构文档：`docs/ARCHITECTURE.md`
- 产品 PRD：`docs/PRODUCT_PRD.md`

