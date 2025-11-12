# 项目架构文档

> 最后更新：2025-11-30

## 🌐 项目概览
- 技术栈：Next.js（Pages Router）+ React 18 + TypeScript + Tailwind CSS
- 认证：NextAuth.js（GitHub OAuth + 邮箱密码双通道），PrismaAdapter 绑定 PostgreSQL
- 数据：PostgreSQL（Neon）持久化 + Prisma ORM + 浏览器 localStorage 混合存储
- 部署：Vercel（`.vercel/` 与 `.env.*`），支持本地 `.env.development.local` 调试
- 特色域逻辑：成就系统、等级系统、心树成长系统、评论系统（Neon serverless）

## 📁 项目结构

```
t3-app/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── onboarding/
│   │   │   └── InterestGrid.tsx
│   │   └── welcome/
│   │       └── WelcomeScreen.tsx
│   ├── lib/
│   │   ├── AchievementSystem.tsx
│   │   ├── AchievementTypes.ts
│   │   ├── HeartTreeSystem.ts
│   │   └── LevelSystem.tsx
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx
│   │   ├── comments.tsx
│   │   ├── heart-tree.tsx
│   │   ├── dashboard/
│   │   │   ├── index.tsx
│   │   │   ├── AchievementPanel.tsx
│   │   │   ├── HeartTree.tsx
│   │   │   ├── PrimaryPlanCard.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   ├── QuickSearchGuide.tsx
│   │   │   └── UserMenu.tsx
│   │   ├── focus/
│   │   │   ├── index.tsx
│   │   │   └── InterruptedSessionAlert.tsx
│   │   ├── plans/
│   │   │   ├── index.tsx
│   │   │   ├── PlanCard.tsx
│   │   │   ├── PlanManagement.tsx
│   │   │   ├── PlanSelector.tsx
│   │   │   ├── AddMilestoneModal.tsx
│   │   │   └── CompletionDialog.tsx
│   │   ├── auth/
│   │   │   ├── redirect.tsx
│   │   │   ├── signin.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   ├── forgot-verify.tsx
│   │   │   └── reset-password.tsx
│   │   ├── onboarding/
│   │   │   ├── index.tsx
│   │   │   ├── focus-selection.tsx
│   │   │   └── goal-setting.tsx
│   │   ├── profile/
│   │   │   ├── index.tsx
│   │   │   └── security-questions.tsx
│   │   ├── legal/
│   │   │   ├── privacy.tsx
│   │   │   └── terms.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth].ts
│   │       │   ├── register.ts
│   │       │   ├── signout.ts
│   │       │   ├── forgot.ts
│   │       │   ├── forgot/
│   │       │   │   └── verify.ts
│   │       │   └── reset.ts
│   │       ├── comments/
│   │       │   ├── create.ts
│   │       │   └── list.ts
│   │       ├── projects/
│   │       │   └── index.ts
│   │       ├── user/
│   │       │   ├── complete-onboarding.ts
│   │       │   ├── profile.ts
│   │       │   ├── change-password.ts
│   │       │   ├── sessions.ts
│   │       │   └── security/
│   │       │       └── set-recovery.ts
│   │       └── test-onboarding.ts
│   ├── server/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── db/
│   │       ├── focusSessions.ts
│   │       └── projects.ts
│   └── styles/
│       └── globals.css
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .next/                 # 构建产物（忽略）
└── ARCHITECTURE.md        # 本文件
```

## 🎯 核心业务模块

### 欢迎与新手引导
- `pages/index.tsx`：现代化欢迎页：
  - Echo 风格文案："我们不为你的待办清单增加又一个任务。我们为你被算法切碎的时间，提供一个完整的意义。"
  - 波浪流线 SVG 背景动画，蓝绿色调（teal/cyan）。
  - 未登录用户显示欢迎界面，已登录用户自动跳转到 Dashboard。
  - 退出登录后跳转到欢迎页而非登录页。
- `pages/onboarding/index.tsx`：兴趣海选页面，最多选择3个兴趣。
- `pages/onboarding/focus-selection.tsx`：三选一聚焦兴趣选择，支持老用户返回流程。
- `pages/onboarding/goal-setting.tsx`：计划表单填写，支持新建和编辑模式：
  - 新建模式：项目名称、专注分支（空白）、第一个里程碑、每日时间、目标日期。
  - 编辑模式：隐藏第一个里程碑字段，保留现有里程碑。
  - 自动创建空白计划卡片（未选择的兴趣）。
- 完成引导后通过 `pages/api/user/complete-onboarding` 同步数据库状态。

### Dashboard（主面板）
- `dashboard/index.tsx` 汇总今日/本周统计、计划进度、成就提示、等级信息、快捷指引等。
- `PrimaryPlanCard`：展示主计划、批量勾选小目标，显示 `focusBranch` 而非 `name`。
- `AchievementPanel` + `QuickSearchGuide`：侧重成就展示与快捷操作提示。
- `SecurityGuideCard`：首次登录引导卡片，提示用户设置密保问题。
- `UserMenu`：用户菜单，包含个人中心入口和退出登录。
- `HeartTree.tsx`：心树可视化。当前页面版 `heart-tree.tsx` 会根据 Session 自动重定向回仪表盘，等待正式开放。
- 依赖 `lib/AchievementSystem`、`lib/LevelSystem` 计算成就与经验。
- UI 采用玻璃态设计，优化比例和视觉层次。

### Focus（专注流程）
- `focus/index.tsx` 实现完整状态机：`preparing → starting → running ↔ paused → completed → summary`。
- `InterruptedSessionAlert` 用于中断恢复提醒。
- 与 localStorage 深度绑定以支持刷新续跑，触发完成后调用仪表盘的经验与成就刷新逻辑。

### Plans（计划管理）
- `plans/index.tsx` 提供计划列表、创建引导、目标设置。
- `PlanManagement`、`PlanSelector` 负责计划切换、激活状态。
- `AddMilestoneModal`、`CompletionDialog` 管理小目标与完成反馈。
- `PlanCard` 支持编辑功能，显示 `focusBranch` 而非 `name`。
- 支持空白计划卡片（`isBlank: true`），用于未选择的兴趣。
- 与 `projectRepository`（Prisma）配合以支持后续数据同步。

### Profile（个人中心）
- `pages/profile/index.tsx`：个人中心主页面，包含概览和安全两个标签页。
  - 概览：个人资料卡片（头像、昵称、等级、称号、签名）、注册日期、绑定邮箱、最近小结预览。
  - 安全：修改密码表单、密保问题设置入口、会话管理、法律条款链接、联系我们。
- `pages/profile/security-questions.tsx`：密保问题设置页面：
  - 模板问题：10个预设问题（5个回忆型 + 5个象征型）。
  - 自定义问题：用户自己输入问题。
  - 答案需要输入两次确认，使用 hash+salt 存储。

### Legal（法律条款）
- `pages/legal/privacy.tsx`：隐私政策页面，独立页面（无底部导航）。
- `pages/legal/terms.tsx`：用户协议页面，独立页面（无底部导航）。
- 两个页面都包含完整的条款内容和底部版权信息。

### Comments（用户反馈）
- `pages/comments.tsx` 前端页面，表单提交后调用 `/api/comments/create` 写入 Neon 数据库，并通过 `/api/comments/list` 拉取。
- 主要用于验证 Serverless Postgres 链接是否可用，提供 UI 与本地缓存提示。

### 认证模块
- `NextAuth` 位于 `pages/api/auth/[...nextauth].ts`：
  - Providers：`GitHubProvider` + `CredentialsProvider`（邮箱/密码，使用 bcrypt）。
  - PrismaAdapter：依赖 `src/server/db.ts` 提供的单例 Prisma Client。
  - Session/JWT Callback 扩展字段 `hasCompletedOnboarding` 供前端判定引导是否完成。
- `auth/signin.tsx` 自定义登录页，支持登录/注册切换：
  - 注册模式：昵称、邮箱、密码（至少8位）、确认密码、同意条款勾选。
  - 登录模式：邮箱、密码，忘记密码链接。
  - Echo 风格波浪流线背景，玻璃态设计。
- `auth/forgot-password.tsx`：忘记密码入口页（Step 1）。
- `auth/forgot-verify.tsx`：密保问题验证页（Step 2）。
- `auth/reset-password.tsx`：新密码设置页（Step 3），成功后自动登录。
- `auth/redirect.tsx` 提供登录后跳转逻辑。

## 🧠 领域服务（`src/lib`）
- **AchievementSystem**：通过 `getAchievementManager()` 单例管理，负责解锁成就、缓存 `achievedAchievements`、推送未读提示。
- **AchievementTypes**：定义所有成就元数据（类型、目标、图标、稀有度）。
- **LevelSystem**：提供经验 → 等级的换算、策略加成（评分、连击奖励、循环周目）。
- **HeartTreeSystem**：维护心树成长数据（成长值、阶段、浇水/施肥、语录），存储于 `localStorage['heartTree']`。

## 🗄️ 服务端与数据库层
- `src/server/db.ts`：Prisma Client 单例，开发环境挂载到 `globalThis` 避免热重载泄露连接。
- `src/server/db/projects.ts`：项目仓储封装（创建项目、查询最新、拉取活跃计划）。
- `src/server/db/focusSessions.ts`：专注会话仓储（创建、完成、周统计）。
- `prisma/schema.prisma` 模型：
  - `User`：NextAuth 用户，含 `hasCompletedOnboarding`。
  - `Project` / `Milestone`：计划与小目标。
  - `FocusSession`：专注记录（rating、duration）。
  - `Comment`：评论表，对接 Neon。
  - `Account` / `Session` / `VerificationToken`：NextAuth 标准表。
- Neon 直连：`pages/api/comments/*.ts` 使用 `@neondatabase/serverless` 直接执行 SQL，确保在无 Prisma Client 场景下可运行。

## 🔌 API 路由概览

### 认证相关
- `POST /api/auth/register`：邮箱注册，密码至少8位，校验并写入 Prisma。
- `POST /api/auth/forgot`：忘记密码入口，返回用户的密保问题列表。
- `POST /api/auth/forgot/verify`：验证密保答案，返回临时重置 token。
- `POST /api/auth/reset`：使用 token 重置密码。
- `api/auth/[...nextauth]`：NextAuth 核心入口。

### 用户相关
- `GET /api/user/profile`：获取用户个人资料信息。
- `POST /api/user/change-password`：修改密码（需要旧密码验证）。
- `GET /api/user/sessions`：获取当前用户的会话列表。
- `DELETE /api/user/sessions`：撤销指定会话。
- `POST /api/user/security/set-recovery`：设置密保问题（hash+salt 存储）。
- `POST /api/user/complete-onboarding`：同步用户引导完成状态。

### 其他
- `GET /api/projects`：需要登录，当前返回 mock 数据；后续可结合 `projectRepository`.
- `POST /api/comments/create`：提交评论，生成 cuid 风格 ID 后入库。
- `GET /api/comments/list`：拉取最新评论列表。
- `api/test-onboarding`：调试接口，模拟引导数据。

## 💾 数据存储层

### PostgreSQL（Prisma 模型）
| 表 | 说明 | 关键字段 |
| --- | --- | --- |
| `User` | 用户主表，保存引导完成状态与密码哈希 | `hasCompletedOnboarding`, `password` |
| `Project` | 专注计划 | `dailyGoalMinutes`, `isActive` |
| `Milestone` | 小目标 | `order`, `isCompleted` |
| `FocusSession` | 专注记录 | `duration`, `rating`, `projectId` |
| `Comment` | 评论 | `comment`, `createdAt` |
| `Account`/`Session`/`VerificationToken` | NextAuth 依赖 | 多字段 |

### localStorage 键值
| Key | 类型 | 用途 |
| --- | --- | --- |
| `userPlans` | `Project[]` | 本地缓存计划列表（含 milestones） |
| `dashboardStats` | `DashboardStats` | 昨日时长、连击天数、完成数 |
| `flowMetrics` | `FlowMetrics` | 心流指数计算所需原始指标 |
| `todayStats` | `{[date]: { minutes, date }}` | 当日时长（按日期分片） |
| `weeklyStats` | `{ totalMinutes, weekStart }` | 周累计数据 |
| `lastFocusDate` | `string` | 最近专注日，用于 streak |
| `focusSession` | `FocusSession` | 运行中专注会话持久化 |
| `focusSessionEnded` | `string` | 标记专注是否已完成 |
| `focusTimerLastSaved` | `string` | 计时器上次保存时间戳 |
| `lastFocusRating` | `number` | 上一次专注评分 |
| `recentFocusSummary` | `object` | 专注完成摘要弹窗数据 |
| `userExp` | `number` | 玩家总经验值（用于 LevelSystem） |
| `achievedAchievements` | `string[]` | 已解锁成就 ID |
| `unviewedAchievements` | `string[]` | 未查看成就通知 |
| `heartTree` | `HeartTree` | 心树成长状态 |
| `hasSecurityQuestions` | `boolean` | 是否已设置密保问题 |
| `securityGuideDismissed` | `boolean` | 是否已关闭安全引导 |
| `loginCount` | `number` | 登录次数（用于引导提醒） |
| `nextSecurityReminder` | `number` | 下次安全提醒的登录次数 |

> 注意：localStorage 主要承担离线体验与 UI 读写性能，未来与 Prisma 数据同步时需做好合并策略。

## 🔄 关键数据流

### 专注完成 → 成就 & 等级刷新
```
focus/index.tsx（completeSession）
  → 更新 localStorage: todayStats / weeklyStats / focusSessionEnded
  → LevelManager.calculateSessionExp → 累加 userExp
  → AchievementManager.check* → 更新 achievedAchievements / unviewedAchievements
  → dashboard/index.tsx useEffect 捕获变化 → 刷新 UI + 展示 AchievementPanel
```

### 计划小目标勾选
```
PrimaryPlanCard.onBulkMilestoneToggle
  → dashboard/index.tsx.handleBulkMilestoneToggle
  → 更新 selectedPlan.milestones & userPlans（localStorage）
  → 触发 LevelManager.calculateMilestoneExp
  → 重算仪表盘进度环、经验条
```

### 评论提交流程
```
comments.tsx.handleSubmit
  → POST /api/comments/create（Neon SQL 插入）
  → 成功后刷新列表：GET /api/comments/list
  → setComments + UI toast
```

### 新手引导完成
```
onboarding/index.tsx 完成表单
  → POST /api/user/complete-onboarding
  → NextAuth session callback 写入 hasCompletedOnboarding
  → 前端根据 session.user.hasCompletedOnboarding 重定向 dashboard
```

### 找回密码流程
```
auth/forgot-password.tsx（输入邮箱/用户名）
  → POST /api/auth/forgot
  → 返回密保问题列表
  → auth/forgot-verify.tsx（回答密保问题）
  → POST /api/auth/forgot/verify
  → 验证答案，返回临时 token
  → auth/reset-password.tsx（设置新密码）
  → POST /api/auth/reset
  → 更新密码，自动登录
```

### 密保问题设置
```
profile/security-questions.tsx
  → 选择模板问题或自定义问题
  → 输入答案（两次确认）
  → POST /api/user/security/set-recovery
  → hash+salt 存储答案
  → 更新 localStorage: hasSecurityQuestions = true
```

## 🧭 状态管理约定
- 以 React Hooks 为主：`useState` 管理局部状态，`useEffect` 与 localStorage 同步。
- 重复计算（如心流指数、经验）使用 `useMemo`、`useCallback` 避免重复渲染。
- 复杂管理器（AchievementManager / LevelManager / HeartTreeManager）封装在 `lib/`，通过函数式接口暴露。
- 因未引入全局状态库，跨页面同步依赖：
  - localStorage 事件监听（`storage`）
  - NextAuth Session（`useSession`）
  - URL 重定向（`next/router`）

## 🛠️ 开发与扩展指南

### 新增页面或功能
1. 在 `src/pages` 创建文件或目录；若需路由保护，先在 `getServerSideProps` 使用 `getServerAuthSession`。
2. 公共 UI 放入 `src/components` 对应子目录；布局相关复用 `Layout.tsx`。
3. 领域逻辑优先添加至 `src/lib`（例如新的成长系统），避免直接散落在页面组件中。

### 引入持久化读写
1. 优先通过 Prisma Repository（在 `src/server/db` 中新增或扩展）。
2. API 层编排数据，前端通过 fetch/axios 调用。
3. 若需离线体验，先写 localStorage，成功同步后清理冗余标记。

### 重点实践
- Tailwind 样式：保持原子类整洁，复用公共颜色/渐变方案。
- Emoji 与视觉：当前 UI 大量使用 emoji 传达情绪，新增卡片请保持一致调性。
- 日志：API 中保留「时间戳 + 路径」日志格式，便于服务器调试。

## 📐 命名与代码规范
- 组件/类型统一 PascalCase；函数/变量用 camelCase；常量 UPPER_SNAKE_CASE。
- 路径别名：通过 `tsconfig.json` 中的 `~/*` 指向 `src/*`。
- 页面级别文件尽量保持单一职责，抽取大型渲染块至子组件。
- Prisma schema 变更后运行 `npx prisma migrate dev` 并更新 `prisma/migrations/`。
- API 路由导入路径：
  - 同目录：`./[...nextauth]`
  - 上级目录：`../auth/[...nextauth]`
  - 跨目录：`../../auth/[...nextauth]`

## 🧪 测试与排查

| 场景 | 现象 | 排查步骤 | 常见原因 |
| --- | --- | --- | --- |
| 仪表盘数据不刷新 | UI 停留在旧数据 | 检查 localStorage 是否最新；确认 `window` 事件监听未被移除；查看控制台报错 | localStorage 写入失败；effect 依赖缺失；序列化异常 |
| 专注恢复失败 | 刷新后回到准备状态 | 确认 `focusSession`、`focusTimerLastSaved` 是否存在；查看倒计时是否被清理 | session 超时被清理；浏览器隐私策略阻断写入 |
| 成就不弹出 | 完成后无通知 | 调试 `getAchievementManager().getAllAchievements()`；检查 `unviewedAchievements` | 目标阈值配置不合理；重复解锁被过滤 |
| 评论接口报 500 | API 返回服务器错误 | 确认 `DATABASE_URL` 是否配置；检查 Neon 权限；查看日志的 `details` 字段 | 环境变量缺失；Neon 连接超时 |
| 登录后仍跳回登录页 | Session 未持久 | 检查浏览器是否阻止第三方 Cookie；确认 Prisma 数据库存在用户记录；查看 NextAuth 回调 | 回调未设置 `session.user.id`；数据库写入失败 |

## 📚 学习与参考
- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [Prisma ORM](https://www.prisma.io/docs)
- [Neon Serverless Postgres](https://neon.tech/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📬 协作提示
- 成就系统详情参见 `src/pages/dashboard/ACHIEVEMENT_README.md`。
- 欢迎页 & 引导逻辑可参考 `components/welcome/WelcomeScreen.tsx` 与 `components/onboarding/InterestGrid.tsx`。
- 若修改数据契约，请同步更新本文件与相关 README。

---

**维护者提示**：此文档是前端、后端与产品讨论的共同基线。合并重大功能前请补充相应章节，并更新「最后更新」时间。


















