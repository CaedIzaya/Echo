# Echo Focus（比赛提交版）Source Code Package

本仓库为基于 **Next.js 15 + React 19 + TypeScript + Prisma + NextAuth** 的全栈应用源码包说明文档，面向技术评审，重点覆盖：**环境与构建、项目结构、核心逻辑定位、源码打包规范**。

---

## 环境与构建说明

### 运行环境

- **Node.js**：建议 20+（与 `@types/node`/Next 版本匹配）
- **包管理器**：npm（见 `package.json` 的 `packageManager: npm@...`）
- **数据库**：PostgreSQL（Prisma ORM）

### 安装依赖

```bash
npm install
```

### 环境变量（禁止提交 `.env`）

本包不包含任何 `.env` 文件。请评审方自行在本地创建 `.env`（不提交）并填写必要变量。

- 参考模板：`env.production.example`
- 变量入口：Next + `@t3-oss/env-nextjs`（见 `src/server/*` 与相关 env 校验实现）

常见必需项（以项目实际 env 校验为准）：

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`（生产/预览环境建议配置）

### 数据库（Prisma）

生成客户端（`postinstall` 会自动执行）：

```bash
npx prisma generate
```

迁移（开发）：

```bash
npm run db:generate
```

迁移（生产部署）：

```bash
npm run db:migrate
```

### 启动与构建

开发模式（注意：默认端口为 3001）：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```

本地启动生产服务：

```bash
npm run start
```

类型检查：

```bash
npm run typecheck
```

---

## 项目结构说明

核心目录（省略非关键文件）：

```
.
├─ prisma/                     # Prisma schema & migrations
├─ public/                     # 静态资源
├─ scripts/                    # 数据校验/同步/清理脚本（开发/运维辅助）
├─ docs/                       # 产品/架构文档（可选阅读）
└─ src/
   ├─ pages/                   # Next.js Pages Router（页面 + API 路由）
   │  ├─ api/                  # 服务端 API（Next API Routes）
   │  ├─ dashboard/            # Dashboard 相关 UI 组件与页面组合
   │  ├─ focus/                # 专注页与专注会话中断处理
   │  ├─ onboarding/           # 引导流程
   │  ├─ plans/                # 计划/里程碑相关页面
   │  └─ ...                   # 其他页面（profile/journal/heart-tree 等）
   ├─ components/              # 跨页面复用组件（如 HeartTree/Shop/Onboarding UI 等）
   ├─ hooks/                   # 客户端 Hooks（统计、成就、经验、同步等）
   ├─ lib/                     # 核心业务逻辑（成就/等级/心流/心树/存储/同步策略等）
   ├─ server/                  # 服务端工具（db/auth 等）
   ├─ awareness/               # 觉察/规则引擎（文案/事件/调度等）
   └─ styles/                  # 全局样式（Tailwind）
```

---

## 核心逻辑代码位置指引（按功能）

### 1) 认证与用户体系

- **NextAuth 配置**：`src/pages/api/auth/*`、`src/server/auth.ts`
- **用户相关 API**：`src/pages/api/user/*`
- **数据库访问入口**：`src/server/db.ts`、`src/server/db/*`

### 2) 专注会话（Focus Session）

- **专注页面**：`src/pages/focus/index.tsx`
- **中断提示/恢复**：`src/pages/focus/InterruptedSessionAlert.tsx`
- **专注会话 API**：`src/pages/api/focus-sessions/*`
- **与 Dashboard 的数据回传/联动**：Dashboard 内对专注完成事件的处理（见 `src/pages/dashboard/index.tsx`）

### 3) Dashboard（汇总视图 + 今日小结入口）

- **Dashboard 主页面**：`src/pages/dashboard/index.tsx`
- **移动端 Dashboard**：`src/pages/dashboard/index.mobile.tsx`
- **今日小结卡片**：`src/pages/dashboard/TodaySummaryCard.tsx`
- **仪表盘数据加载/缓存**：`src/hooks/useDashboardData.ts`、`src/hooks/useUserStats.ts`（以及相关 hooks）

### 4) 日总结 / 周报

- **日总结页面**：`src/pages/daily-summary.tsx`
- **日总结 API**：`src/pages/api/daily-summary/*`
- **周报页面**：`src/pages/reports/weekly.tsx`
- **周报生成逻辑**：`src/lib/weeklyReport.ts`、`src/pages/api/weekly-report/*`、`src/pages/api/weekly-reports/*`

### 5) 计划（Projects）与里程碑（Milestones）

- **计划页面**：`src/pages/plans/*`
- **里程碑管理组件**：`src/components/milestone/MilestoneManager.tsx`
- **Projects API**：`src/pages/api/projects/*`
- **Milestones API**：`src/pages/api/milestones/*`

### 6) 成就系统（Achievements）

> 本项目存在两层：**业务成就判定管理器** 与 **数据库同步 Hook**。

- **成就判定/解锁逻辑**：`src/lib/AchievementSystem.tsx`
- **成就数据库同步 Hook**：`src/hooks/useAchievements.ts`
- **成就相关 API**：`src/pages/api/achievements/*`
- **成就展示 UI**：`src/pages/dashboard/AchievementPanel.tsx`

### 7) 等级/经验系统（Level / EXP）

- **等级/经验算法**：`src/lib/LevelSystem.tsx`
- **用户经验 Hook（持久化到 DB）**：`src/hooks/useUserExp.ts`
- **统计计算**：`src/lib/statsCalculator.ts`

### 8) 心流指数（Flow Index）

- **核心计算**：`src/lib/flowEngine.ts`
- **性能/优化辅助**：`src/lib/performanceOptimizer.ts`、`src/hooks/usePerformance.ts`

### 9) 心树（Heart Tree）

- **核心系统**：`src/lib/HeartTreeSystem.ts`、`src/lib/HeartTreeExpSystem.ts`
- **UI 组件**：`src/components/heart-tree/*`、`src/pages/heart-tree.tsx`

### 10) 觉察引擎（Awareness）

- **入口与整合**：`src/awareness/index.ts`、`src/awareness/engine.ts`
- **规则/调度/事件**：`src/awareness/rules.ts`、`src/awareness/dispatcher.ts`、`src/awareness/event-integration.ts`
- **集成说明**：`src/awareness/START-HERE.md`、`src/awareness/INTEGRATION-*.md`

---

## 数据与存储策略（快速说明）

- **数据库 Schema**：`prisma/schema.prisma`
- **客户端缓存/隔离存储**：`src/lib/userStorage.ts`、`src/lib/safeStorage.ts`
- **同步策略（含重试/优先级）**：`src/lib/dataSync/strategy.ts`、`src/hooks/useSmartDataSync.ts`、`src/hooks/useDataSync.ts`

---

## 比赛提交：Source Code Package 打包规范（务必遵守）

### 必须排除

- `node_modules/`
- `.git/`
- `.next/`、`dist/`、`out/`、各类缓存/临时文件
- **任何 `.env` 文件**（包括 `.env.local` / `.env.production` 等）

### Windows PowerShell 示例（推荐）

在项目根目录执行，生成 `source-code-package.zip`：

```powershell
$zip = "source-code-package.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

$exclude = @(
  "node_modules",
  ".git",
  ".next",
  "dist",
  "out"
)

$items = Get-ChildItem -Force | Where-Object { $exclude -notcontains $_.Name }

# 过滤所有 .env* 文件（不论在根目录还是子目录）
$items = $items | Where-Object { $_.Name -notlike ".env*" }

Compress-Archive -Path $items.FullName -DestinationPath $zip
```

打包完成后，请自行检查压缩包内是否误包含 `.env`、`node_modules` 等敏感/冗余内容。

---

## 评审快速入口（建议阅读顺序）

1. **功能汇总入口**：`src/pages/dashboard/index.tsx`
2. **专注会话主流程**：`src/pages/focus/index.tsx`
3. **成就判定/等级/心流算法**：`src/lib/AchievementSystem.tsx`、`src/lib/LevelSystem.tsx`、`src/lib/flowEngine.ts`
4. **数据同步与持久化**：`src/hooks/useSmartDataSync.ts`、`src/lib/dataSync/strategy.ts`、`src/lib/userStorage.ts`
5. **API 与数据模型**：`src/pages/api/*`、`prisma/schema.prisma`

# Echo - 数字静默专注应用

## ⚠️ 法律声明

**该产品禁止任何形式的传播和私用，本产品已公安和ICP备案，否则将会追究法律责任。**

---

**提示**：本项目默认使用 SQLite 本地数据库，无需配置外部数据库即可运行

## 📋 项目简介

Echo 是一款基于 T3 Stack 的现代化专注管理应用，致力于帮助用户培养专注习惯，记录成长轨迹。

### 核心功能
- 🎯 **专注计时**：番茄钟计时、心流指数评估
- 📊 **数据看板**：专注统计、连续天数、成就系统
- 📝 **每日小结**：回顾总结、心情记录
- 📔 **日记系统**：查看历史专注记录
- 🌳 **心树系统**：浇水施肥、等级成长
- 📋 **计划管理**：主要计划、里程碑管理
- 📧 **邮件系统**：周报、成就通知

---

## 🛠️ 技术栈

### 核心框架
- **Next.js 15.5.9** - React 全栈框架
- **TypeScript** - 类型安全
- **Prisma** - ORM 数据库管理
- **PostgreSQL** - 生产数据库
- **NextAuth.js** - 身份认证

### 前端技术
- **React 18** - UI 框架
- **TailwindCSS** - 样式方案
- **Framer Motion** - 动画效果

### 部署方案
- **阿里轻量应用服务器** - 服务器选择
- **PostgreSQL** - 数据库托管

---

## 🚀 环境要求

### 必需环境
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

### 数据库
- **SQLite**（默认）：无需安装，开箱即用
- **PostgreSQL**（生产环境可选）：>= 14.0

### 开发工具（推荐）
- **VS Code** + TypeScript 扩展
- **Git**
- **Postman** / **Thunder Client**（API 测试）

---

## 📦 依赖安装

### 1. 克隆项目（或解压源码包）
```bash
# 如果是压缩包，请解压后进入目录
cd t3-app
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
创建 `.env` 文件：

```env
# 数据库连接（SQLite 本地数据库）
DATABASE_URL="file:./dev.db"

# NextAuth 配置
NEXTAUTH_SECRET="your-random-secret-key-at-least-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"
```

**注意**：
- SQLite 会在项目根目录创建 `dev.db` 文件
- 无需安装数据库服务器，开箱即用
- 如需使用 PostgreSQL，请修改 DATABASE_URL 和 `prisma/schema.prisma` 中的 provider

### 4. 初始化数据库
```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# （可选）查看数据库
npx prisma studio
```

---

## 🏗️ 构建与运行

### 开发模式
```bash
npm run dev
```
访问：http://localhost:3000

### 生产构建
```bash
# 构建
npm run build

# 运行生产版本
npm start
```

### 类型检查
```bash
npm run type-check
```

### 代码规范检查
```bash
npm run lint
```

---

## 📁 项目结构

```
t3-app/
├── prisma/                    # 数据库相关
│   ├── schema.prisma         # 数据库模型定义
│   └── migrations/           # 数据库迁移文件
│
├── src/
│   ├── pages/                # 页面路由
│   │   ├── api/             # API 路由
│   │   │   ├── auth/        # 认证相关 API
│   │   │   ├── focus-sessions/  # 专注会话 API
│   │   │   ├── projects/    # 计划管理 API
│   │   │   ├── journal/     # 日记系统 API
│   │   │   ├── heart-tree/  # 心树系统 API
│   │   │   └── user/        # 用户数据 API
│   │   ├── dashboard/       # 主界面
│   │   ├── focus/           # 专注页面
│   │   ├── plans/           # 计划管理
│   │   ├── journal.tsx      # 日记页面
│   │   └── heart-tree.tsx   # 心树页面
│   │
│   ├── components/           # 可复用组件
│   │   ├── focus/           # 专注相关组件
│   │   ├── heart-tree/      # 心树组件
│   │   └── plans/           # 计划组件
│   │
│   ├── lib/                 # 核心业务逻辑
│   │   ├── HeartTreeSystem.ts      # 心树系统
│   │   ├── HeartTreeExpSystem.ts   # 心树经验系统
│   │   ├── AchievementSystem.tsx   # 成就系统
│   │   ├── LevelSystem.tsx         # 等级系统
│   │   ├── weeklyReport.ts         # 周报生成
│   │   └── statsCalculator.ts     # 统计计算
│   │
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useDashboardData.ts    # 仪表盘数据
│   │   ├── useHeartTreeExp.ts     # 心树经验
│   │   └── useProjects.ts         # 计划数据
│   │
│   ├── server/              # 服务端代码
│   │   ├── auth.ts          # 认证配置
│   │   └── db.ts            # 数据库连接
│   │
│   └── styles/              # 全局样式
│       └── globals.css
│
├── public/                   # 静态资源
├── docs/                     # 文档
│   ├── ARCHITECTURE.md      # 架构文档
│   └── PRODUCT_PRD.md       # 产品需求文档
│
├── package.json             # 依赖配置
├── tsconfig.json            # TypeScript 配置
├── tailwind.config.ts       # TailwindCSS 配置
└── next.config.mjs          # Next.js 配置
```

---

## 🎯 核心功能代码指引

### 1. 用户认证系统
**位置**：`src/server/auth.ts` + `src/pages/api/auth/`

**关键文件**：
- `src/server/auth.ts` - NextAuth 配置
- `src/pages/api/auth/[...nextauth].ts` - 认证 API
- `src/pages/api/auth/register.ts` - 用户注册
- `src/pages/auth/signin.tsx` - 登录页面

**核心逻辑**：
- 支持邮箱密码登录
- Session 管理
- 用户数据隔离

---

### 2. 专注计时系统
**位置**：`src/pages/focus/` + `src/pages/api/focus-sessions/`

**关键文件**：
- `src/pages/focus/index.tsx` - 专注计时页面（番茄钟）
- `src/pages/api/focus-sessions/index.ts` - 专注会话 API
- `src/lib/flowEngine.ts` - 心流指数计算引擎

**核心逻辑**：
```typescript
// 专注会话保存
POST /api/focus-sessions
{
  startTime: Date,
  endTime: Date,
  duration: number,  // 分钟
  rating: number,    // 心流评分 1-5
  projectId: string  // 关联计划
}
```

**关键功能**：
- 番茄钟计时（25分钟）
- 心流指数评估
- 专注记录保存
- 自动更新统计数据

---

### 3. 数据看板（Dashboard）
**位置**：`src/pages/dashboard/`

**关键文件**：
- `src/pages/dashboard/index.tsx` - 主界面
- `src/pages/api/dashboard/stats.ts` - 统计数据 API
- `src/hooks/useDashboardData.ts` - 数据加载 Hook

**核心数据**：
```typescript
{
  todayMinutes: number,      // 今日专注时长
  weeklyMinutes: number,     // 本周专注时长
  totalMinutes: number,      // 累计专注时长
  streakDays: number,        // 连续专注天数
  completedGoals: number,    // 完成小目标数
  completedProjects: number  // 完成计划数
}
```

**关键功能**：
- 今日/本周/累计统计
- 主要计划进度
- 成就展示
- 心树状态

---

### 4. 计划管理系统
**位置**：`src/pages/plans/` + `src/pages/api/projects/`

**关键文件**：
- `src/pages/plans/index.tsx` - 计划列表页
- `src/pages/api/projects/index.ts` - 计划 CRUD API
- `src/pages/api/projects/[id].ts` - 单个计划操作
- `src/pages/api/milestones/[id].ts` - 里程碑操作

**数据模型**：
```typescript
Project {
  name: string,
  icon: string,
  dailyGoalMinutes: number,
  isPrimary: boolean,        // 是否主要计划
  isCompleted: boolean,
  milestones: Milestone[]
}

Milestone {
  title: string,
  isCompleted: boolean,
  order: number
}
```

**核心逻辑**：
- 主要计划（Primary Plan）：同时只能有一个
- 里程碑（Milestones）：可完成的小目标
- 计划完成时自动更新全局统计

---

### 5. 日记系统
**位置**：`src/pages/journal.tsx` + `src/pages/api/journal/`

**关键文件**：
- `src/pages/journal.tsx` - 日记页面（日历视图）
- `src/pages/api/journal/month.ts` - 月度数据 API
- `src/pages/api/journal/day.ts` - 单日详情 API

**核心逻辑**：
```typescript
// 月度摘要
GET /api/journal/month?year=2026&month=1
返回：每天的小结预览（最多60字）

// 单日详情
GET /api/journal/day?date=2026-01-15
返回：完整小结、专注会话、统计数据
```

**关键功能**：
- 日历网格展示
- 点击查看详情
- 月份切换
- 保留近100天数据

---

### 6. 心树系统
**位置**：`src/pages/heart-tree.tsx` + `src/lib/HeartTree*.ts`

**关键文件**：
- `src/pages/heart-tree.tsx` - 心树页面
- `src/lib/HeartTreeSystem.ts` - 心树基础系统
- `src/lib/HeartTreeExpSystem.ts` - 经验系统
- `src/pages/api/heart-tree/` - 心树 API

**核心机制**：
```typescript
// 经验获得
- 完成专注：+10 EXP
- 完成小目标：+30 EXP
- 浇水：+5 EXP

// 浇水机会
- 每次专注完成：+1次机会
- 达成每日目标：+1次额外机会

// 施肥机会
- 达成每日目标：+1次
- 解锁成就：+1次
```

**关键功能**：
- 等级成长系统
- 浇水/施肥机制
- 果实收获
- 心树命名

---

### 7. 成就系统
**位置**：`src/lib/AchievementSystem.tsx`

**关键文件**：
- `src/lib/AchievementSystem.tsx` - 成就定义和管理
- `src/lib/AchievementTypes.ts` - 成就类型定义
- `src/pages/api/achievements/` - 成就 API

**成就类别**：
- **首次成就**：首次专注、首次完成计划等
- **时长成就**：累计专注 10h/100h/1000h
- **连续成就**：连续专注 7天/30天/100天
- **里程碑成就**：完成小目标数量
- **心流成就**：高心流状态

**核心逻辑**：
```typescript
// 成就检查
AchievementManager.checkAndUnlock(userId, achievementId)

// 自动解锁
- 完成专注会话时检查
- 完成计划/里程碑时检查
- 达到特定数据阈值时触发
```

---

### 8. 周报系统
**位置**：`src/lib/weeklyReport.ts` + `src/pages/api/weekly-report/`

**关键文件**：
- `src/lib/weeklyReport.ts` - 周报生成逻辑
- `src/pages/api/weekly-report/index.ts` - 周报 API
- `src/pages/reports/weekly.tsx` - 周报展示页

**核心数据**：
```typescript
WeeklyReport {
  weekStart: Date,
  weekEnd: Date,
  totalMinutes: number,      // 本周专注时长
  wowChange: number,         // 周环比变化
  streakDays: number,        // 连续天数
  bestDay: Date,            // 最佳专注日
  flowAvg: number,          // 平均心流指数
  completedMilestones: Milestone[]
}
```

**关键功能**：
- 每周自动生成
- 数据对比分析
- 成长趋势展示
- 邮件推送（可选）

---

### 9. 数据同步与缓存
**位置**：`src/hooks/` + `src/lib/`

**关键文件**：
- `src/hooks/useDashboardData.ts` - 仪表盘数据加载
- `src/hooks/useCachedProjects.ts` - 计划缓存
- `src/lib/userStorage.ts` - 用户隔离存储

**核心策略**：
- **数据库优先**：所有关键数据存储在 PostgreSQL
- **localStorage 缓存**：减少 API 请求，提升性能
- **用户隔离**：localStorage 按 userId 隔离
- **自动同步**：定期检查数据一致性

---

### 10. 数据库模型
**位置**：`prisma/schema.prisma`

**核心模型**：

```prisma
// 用户
model User {
  id                     String
  email                  String
  streakDays             Int        // 连续天数
  totalFocusMinutes      Int        // 总专注时长
  totalCompletedMilestones Int      // 总完成小目标数
  totalCompletedProjects   Int      // 总完成计划数
  heartTreeLevel         Int        // 心树等级
  fruits                 Int        // 果实数量
}

// 计划
model Project {
  id                  String
  name                String
  dailyGoalMinutes    Int
  isPrimary           Boolean      // 主要计划
  isCompleted         Boolean
  totalFocusMinutes   Int          // 该计划专注时长
  streakDays          Int          // 该计划连续天数
  completedMilestones Int          // 完成小目标数
  milestones          Milestone[]
}

// 里程碑
model Milestone {
  id          String
  title       String
  isCompleted Boolean
  projectId   String
  project     Project
}

// 专注会话
model FocusSession {
  id        String
  startTime DateTime
  endTime   DateTime
  duration  Int          // 分钟
  flowIndex Int          // 心流指数
  projectId String
  userId    String
}

// 每日小结
model DailySummary {
  id                 String
  userId             String
  date               String    // YYYY-MM-DD
  text               String    // 小结内容
  totalFocusMinutes  Int
  completedTaskCount Int
}

// 成就
model Achievement {
  id            String
  userId        String
  achievementId String
  category      String
  unlockedAt    DateTime
}
```

---

## 🔒 安全性

### 1. 身份认证
- NextAuth.js 提供 Session 管理
- 所有 API 必须验证 Session
- 密码使用 bcrypt 加密

### 2. 数据隔离
- 所有查询必须过滤 `userId`
- 防止用户访问他人数据
- API 层严格校验权限

### 3. SQL 注入防护
- 使用 Prisma ORM
- 参数化查询
- 类型安全

### 4. XSS 防护
- React 自动转义
- 用户输入验证
- CSP 头部配置

---

## 📊 性能优化

### 1. 数据库优化
- 关键字段建立索引
- 使用 select 指定字段
- 并行查询（Promise.all）

### 2. 前端优化
- 代码分割（Next.js 自动）
- 图片懒加载
- localStorage 缓存

### 3. API 优化
- 按需加载数据
- 分页查询
- 响应压缩

---

## 🐛 常见问题

### 1. 数据库连接失败
```bash
# 检查 DATABASE_URL 配置
echo $DATABASE_URL

# 测试数据库连接
npx prisma db push
```

### 2. 依赖安装失败
```bash
# 清除缓存
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 3. 构建失败
```bash
# 检查 TypeScript 错误
npm run type-check

# 检查 Lint 错误
npm run lint
```

### 4. 端口占用
```bash
# 修改端口
PORT=3001 npm run dev
```

---

## 📝 开发规范

### 1. 代码风格
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- Prettier 格式化

### 2. Git 提交
- 使用语义化提交信息
- 小步提交，频繁推送
- 代码审查后合并

### 3. 命名规范
- 组件：PascalCase（`UserProfile.tsx`）
- 文件：kebab-case（`user-profile.ts`）
- 变量：camelCase（`userName`）
- 常量：UPPER_CASE（`MAX_LENGTH`）

---

## 📖 相关文档

- [架构文档](docs/ARCHITECTURE.md) - 详细技术架构
- [产品PRD](docs/PRODUCT_PRD.md) - 产品需求文档
- [Prisma 文档](https://www.prisma.io/docs/)
- [Next.js 文档](https://nextjs.org/docs)
- [TailwindCSS 文档](https://tailwindcss.com/docs)

---

## 🤝 技术支持

如有技术问题，请查阅：
1. 项目文档（docs/ 目录）
2. 代码注释
3. API 日志输出

---

## 📄 许可证

**该产品禁止任何形式的传播和私用，本产品已公安和ICP备案，否则将会追究法律责任。**

版权所有 © 2026 Echo Team. All Rights Reserved.

---

## 🎯 快速上手

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp env.production.example .env
# 编辑 .env 文件，配置数据库连接

# 3. 初始化数据库
npx prisma generate
npx prisma migrate deploy

# 4. 启动开发服务器
npm run dev

# 5. 访问应用
open http://localhost:3000
```

**祝你使用愉快！** 🚀

