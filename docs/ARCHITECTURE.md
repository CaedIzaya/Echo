# 项目架构文档（以代码为准）

## 1. 项目概述
Echo Focus（数字静默）是一个围绕“专注、回顾、成长记录”的轻量应用。它把专注计时、计划拆解、日小结、心树成长、收件箱周报放在同一套体验里，核心目标是：让用户用温和、可持续的方式看见自己的节奏。

本文档只描述当前代码中已经实现的内容，方便新同事快速理解系统结构与落地方式。

## 2. 技术栈
- **框架**：Next.js 15.5.9（Pages Router）
- **前端**：React 19、TypeScript 5.8
- **样式**：Tailwind CSS 4.0
- **动画**：Framer Motion 11
- **认证**：NextAuth（Credentials + JWT）
- **数据库**：Prisma 6.19（`schema.prisma` 当前配置为 SQLite，使用 `DATABASE_URL`）
- **数据与校验**：Zod
- **密码加密**：bcryptjs
- **图像导出**：html2canvas
- **本地持久化**：localStorage + sessionStorage + localforage（IndexedDB）

## 3. 系统分层
- **页面层（UI）**：`src/pages/**`
- **组件层**：`src/components/**`、`src/pages/dashboard/**`
- **业务与规则层**：`src/lib/**`、`src/awareness/**`、`src/hooks/**`
- **API 层**：`src/pages/api/**`
- **数据库层**：`prisma/schema.prisma` + `src/server/db.ts`

简单数据流：
```
UI(页面/组件)
  -> hooks/lib 处理状态与规则
  -> localStorage/sessionStorage/localforage 作为本地缓存
  -> API routes 读写数据库
  -> Prisma -> SQLite/数据库
```

## 4. 目录结构（关键部分）
- `src/pages/`：页面入口
- `src/pages/api/`：API 路由
- `src/components/`：通用组件（心树、日历、商城、欢迎等）
- `src/lib/`：核心系统（成就、等级、心流、心树、周报、主题、同步）
- `src/awareness/`：觉察规则与文案引擎
- `src/hooks/`：数据与状态 Hook
- `prisma/`：数据库模型
- `public/`：静态资源（应用图标）

## 5. 核心功能域与入口
### 5.1 专注计时
- 页面：`src/pages/focus/index.tsx`
- 关键组件：`src/pages/focus/InterruptedSessionAlert.tsx`
- 关键能力：时间戳计时、暂停限制、完成/中断、专注评分

### 5.2 Dashboard（数据总览与入口）
- 页面：`src/pages/dashboard/index.tsx`
- 关键组件：`ProgressRing.tsx`（今日进度）
- 关键组件：`PrimaryPlanCard.tsx`（主计划）
- 关键组件：`TodaySummaryCard.tsx`（今日小结入口）
- 关键组件：`SpiritDialog.tsx`（小精灵文案）
- 关键组件：`MailPanel.tsx`（收件箱）
- 关键组件：`BottomNavigation.tsx`（底部导航）

### 5.3 计划与里程碑
- 页面：`src/pages/plans/index.tsx`
- 组件：`PlanCard.tsx`、`PlanManagement.tsx`、`AddMilestoneModal.tsx`
- 编辑入口：`/onboarding/goal-setting`

### 5.4 心树成长
- 页面：`src/pages/heart-tree.tsx`
- 组件：`src/pages/dashboard/HeartTree.tsx`、`src/components/heart-tree/**`
- 规则：`src/lib/HeartTreeSystem.ts`、`src/lib/HeartTreeExpSystem.ts`

### 5.5 日小结 / 日记
- 页面：`src/pages/daily-summary.tsx`
- 日记页面：`src/pages/journal.tsx`
- 分享页：`src/pages/s/[token].tsx`

### 5.6 商城与主题
- 组件：`src/components/shop/ShopModal.tsx`
- 主题系统：`src/lib/themeSystem.ts`

### 5.7 认证与个人中心
- 认证页：`src/pages/auth/*`
- 个人中心：`src/pages/profile/index.tsx`

### 5.8 其它
- 评论页：`src/pages/comments.tsx`

## 6. 数据存储
### 6.1 本地存储（localStorage）
本地数据采用“用户隔离”策略（`src/lib/userStorage.ts`）：
- 访问键会被自动加上 `user_{id}_` 前缀
- 用于首屏速度和离线体验

常用键（按业务分类）：
- **专注**：`focusSession`、`todayStats`、`weeklyStats`、`totalFocusMinutes`、`lastFocusDate`
- **计划**：`userPlans`
- **成就/等级**：`userExp`、`achievedAchievements`、`unviewedAchievements`
- **心树**：`heartTreeExpState`、`heartTreeNameV1`
- **觉察/文案节流**：`lastWelcomeDate`、`lastSpiritInteractionDate`、`lateNightAwarenessShownDate`
- **同步/恢复**：`dataRecovered`、`dataRecoveredAt`、`just_cleaned_cache`
- **主题**：`selectedTheme`

### 6.2 sessionStorage
- `currentUserId`（用户隔离存储的上下文）
- `lastSummaryFetchDate`（小结日期变化检测）
- `goalSetPromptShown_YYYY-MM-DD`（避免重复弹窗）

### 6.3 IndexedDB（localforage）
- 本地头像缓存：`echo-avatar-v1`

### 6.4 数据库模型（Prisma）
核心表：
- `User`（账号、经验、心树等级、果实、主题、心流指标等）
- `Project` / `Milestone`（计划与里程碑）
- `FocusSession`（专注记录）
- `DailySummary` / `ShareLink`（每日小结与分享链接）
- `WeeklyReport`（周报）
- `Mail`（收件箱）
- `Achievement`（成就）
- `ShopPurchase`（商城购买记录）
- `RecoveryQuestion` / `PasswordResetToken`（安全与找回）

## 7. 同步与一致性策略
- **用户隔离存储**：`userStorage` 给本地数据加 userId 前缀
- **智能同步**：`useSmartDataSync` 按频率分级同步（高频/中频/低频）
- **全量同步**：`/api/user/sync-all-data` 登录后拉取数据库覆盖本地
- **数据完整性**：`DataIntegritySystem` 检测清缓存后的异常并尝试恢复
- **版本清理**：`versionManager` 版本变更时清理本地并设置 `just_cleaned_cache`

## 8. 关键流程（落地路径）
### 8.1 专注完成流程
1. `/focus` 结束专注（完成/中断）
2. 按时间戳计算真实时长
3. 更新 localStorage（todayStats/weeklyStats/totalFocusMinutes）
4. 触发 Dashboard 更新心流/成就/等级
5. 保存 FocusSession 到数据库

### 8.2 计划编辑流程
1. `/plans` 选择编辑
2. 进入 `/onboarding/goal-setting` 修改
3. 更新 `userPlans` 与数据库项目数据

### 8.3 日小结与分享
1. `/daily-summary` 保存小结（`DailySummary`）
2. 生成分享链接（`ShareLink`）
3. `/s/[token]` 展示分享卡片

### 8.4 周报生成
1. Dashboard 调用 `/api/weekly-report/auto` 或定时任务 `/api/weekly-report/cron`
2. `weeklyReport.ts` 计算并落库
3. 创建 `Mail`，在收件箱可见

### 8.5 心树浇水/施肥
1. 心树页面触发浇水/施肥
2. 更新 `HeartTreeExpState` 与用户心树字段
3. 施肥 buff 通过 `fertilizerExpiresAt` 管理

## 9. API 路由一览
### 认证
- `/api/auth/[...nextauth]`
- `/api/auth/register`
- `/api/auth/forgot`、`/api/auth/forgot/verify`
- `/api/auth/reset`
- `/api/auth/signout`

### 用户与统计
- `/api/user/profile`
- `/api/user/change-password`
- `/api/user/complete-onboarding`
- `/api/user/sessions`
- `/api/user/security/set-recovery`
- `/api/user/exp`、`/api/user/exp/update`、`/api/user/exp/announce-level`
- `/api/user/stats`、`/api/user/stats/update`
- `/api/user/flow-metrics`
- `/api/user/fruits`
- `/api/user/theme`
- `/api/user/sync-all-data`

### 专注
- `/api/focus-sessions`

### 计划与里程碑
- `/api/projects`、`/api/projects/[id]`
- `/api/projects/[id]/milestones`
- `/api/projects/[id]/milestones/[milestoneId]`
- `/api/projects/migrate-from-local`
- `/api/milestones/[id]`

### 成就
- `/api/achievements`、`/api/achievements/unlock`

### 心树
- `/api/heart-tree/get-name`
- `/api/heart-tree/update-name`
- `/api/heart-tree/water`
- `/api/heart-tree/fertilize`
- `/api/heart-tree/exp`、`/api/heart-tree/exp/update`
- `/api/heart-tree/bloom/check`、`/api/heart-tree/bloom/status`

### 日小结 / 日记
- `/api/daily-summary/today`
- `/api/journal/recent`、`/api/journal/day`、`/api/journal/month`

### 周报与邮件
- `/api/weekly-report`、`/api/weekly-report/auto`、`/api/weekly-report/cron`
- `/api/weekly-reports/history`
- `/api/mails`、`/api/mails/backfill`

### 商城
- `/api/shop/items`
- `/api/shop/purchase`

### 分享
- `/api/share-links`、`/api/share-links/[token]`

### 其它
- `/api/comments/create`、`/api/comments/list`
- `/api/dashboard/stats`
- `/api/stats`
- `/api/test-db`、`/api/test-onboarding`（调试）

## 10. 安全与隐私
- NextAuth + JWT 会话
- bcryptjs 存储密码哈希
- 找回问题与重置 Token
- 分享链接使用 token
- 不读取用户隐私文本内容

## 11. 运行与配置
### 必要环境变量
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `CRON_SECRET`（周报 cron）

### 本地命令
```bash
npm run dev        # 开发（端口 3001）
npm run build      # 构建
npm run start      # 生产启动
npm run typecheck  # 类型检查
npm run db:generate
npm run db:migrate
npm run db:push
```
