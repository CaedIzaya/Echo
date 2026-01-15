# 项目架构文档

## 项目概述

Echo Focus（数字静默）是一个基于 Next.js 的专注时间管理应用，帮助用户夺回注意力与意识主权。应用提供计划管理、专注计时、成就系统、心流指数、等级系统等功能，通过游戏化机制激励用户持续专注。

## 技术栈

- **框架**: Next.js 15.5.4 (React 19)
- **认证**: NextAuth.js 4.24.11
- **数据库**: PostgreSQL (通过 Prisma ORM)
- **状态管理**: React Hooks + localStorage
- **样式**: Tailwind CSS 4.0
- **类型**: TypeScript 5.8
- **动画**: Framer Motion 11.18
- **密码加密**: bcryptjs
- **环境变量**: @t3-oss/env-nextjs + Zod

## 项目结构

```
t3-app/
├── src/
│   ├── components/          # 共享组件
│   │   ├── heart-tree/      # 心树组件（待实现）
│   │   ├── onboarding/      # 引导流程组件
│   │   └── welcome/         # 欢迎界面组件
│   ├── lib/                 # 核心库
│   │   ├── AchievementSystem.tsx    # 成就系统
│   │   ├── LevelSystem.tsx          # 等级系统
│   │   ├── flowEngine.ts           # 心流引擎
│   │   └── HeartTreeSystem.ts      # 心树系统（待实现）
│   ├── pages/               # 页面路由
│   │   ├── api/             # API 路由
│   │   │   ├── auth/        # 认证相关
│   │   │   ├── user/        # 用户相关
│   │   │   ├── projects/    # 项目相关
│   │   │   └── comments/    # 评论相关
│   │   ├── auth/            # 认证页面
│   │   ├── dashboard/       # 仪表盘组件
│   │   ├── focus/           # 专注计时器
│   │   ├── plans/           # 计划管理
│   │   ├── profile/         # 个人中心
│   │   ├── onboarding/      # 引导流程
│   │   └── legal/           # 法律页面
│   ├── server/              # 服务端代码
│   │   ├── auth.ts          # 认证工具
│   │   ├── db.ts            # 数据库连接
│   │   └── db/              # 数据库操作
│   └── styles/              # 全局样式
├── prisma/                  # Prisma 配置
│   ├── schema.prisma        # 数据库模型
│   └── migrations/          # 数据库迁移
└── public/                  # 静态资源
```

## 核心功能模块

### 1. 专注计时器 (`/src/pages/focus/index.tsx`)

专注计时器的核心功能，支持：
- **准备状态**: 设置专注时长、选择计划、设置小目标
- **3秒倒计时**: 专注开始前的准备
- **专注进行中**: 基于时间戳的计时，避免后台挂起时计时不准
- **暂停/恢复功能**: 限制暂停次数，防止滥用
- **完成/中断状态**: 支持正常完成和意外中断
- **自动保存**: 实时保存到 localStorage
- **24小时过期机制**: 超过24小时的会话自动清理
- **中断会话恢复**: 检测并提示恢复中断的会话

**关键特性：**
- 使用时间戳计算已专注时长，确保准确性
- 支持超额完成（超过目标时长显示金色背景）
- 自动同步到 dashboard 统计数据
- 支持选择计划或自由时间模式
- 支持计划小目标和自定义小目标

**状态管理：**
- `preparing` - 准备中（设置时长）
- `starting` - 3秒倒计时
- `running` - 专注进行中
- `paused` - 已暂停
- `completed` - 正常完成
- `interrupted` - 意外中断

### 2. Dashboard (`/src/pages/dashboard/index.tsx`)

主仪表盘页面，显示：
- **今日完成进度**: 环形进度图（ProgressRing）
- **用户等级和经验值**: 显示当前等级、称号、进度条
- **连续专注天数**: 连续专注记录
- **本周专注时长**: 每周一00:00自动重置
- **累计专注时长**: 从加入 Echo 以来的所有时长（永久记录）
- **心流指数**: 可展开查看详细分解（质量、时长、一致性）
- **最近成就展示**: 显示最近5个已解锁成就
- **主要计划卡片**: 显示当前主要计划和小目标进度
- **EchoSpirit 小精灵**: 交互式小精灵组件
- **快速查找指南**: 帮助用户快速上手
- **安全指南卡片**: 提醒用户设置安全问题

**数据同步：**
- 通过 `window.reportFocusSessionComplete` 接收专注完成回调
- 实时更新今日和本周统计数据
- 自动归档昨日数据
- 监听 localStorage 变化，实时更新成就

**数据恢复机制：**
- 组件挂载时自动从 `flowMetrics` 和 `todayStats` 恢复总专注时长
- 如果 `totalFocusMinutes` 为0，尝试从历史数据恢复
- 恢复后标记 `dataRecovered`，避免重复恢复

### 3. 计划管理 (`/src/pages/plans/index.tsx`)

计划管理页面，支持：
- **浏览所有计划**: 显示活跃和已完成的计划
- **创建新计划**: 跳转到 onboarding 流程
- **编辑计划**: 跳转到 goal-setting 页面
- **管理计划**: 设置主要、删除、完成
- **添加小目标**: 为计划添加里程碑
- **计划完成确认**: 完成计划前的确认对话框

**编辑计划流程：**
- 点击编辑 → 跳转到 `/onboarding/goal-setting`，传递 `editPlanId` 和 `from: 'plans'`
- 编辑完成后返回 → 直接返回到 `/plans` 页面（不是三选一界面）

**页面状态：**
- `browsing` - 浏览模式（默认）
- `managing` - 管理模式（选择计划进行操作）

### 4. 引导流程 (`/src/pages/onboarding/`)

#### 4.1 兴趣选择 (`index.tsx`)
- 显示12个兴趣选项（3x4网格）
- 支持多选
- 选择后跳转到目标设定页面

#### 4.2 目标设定 (`goal-setting.tsx`)
- 创建新计划或编辑现有计划
- 设置计划名称、图标、每日目标时长
- 添加小目标（里程碑）
- 支持编辑模式和创建模式

### 5. 认证系统 (`/src/pages/auth/`)

#### 5.1 登录/注册 (`signin.tsx`)
- 统一的登录注册界面
- 支持邮箱密码注册
- 支持邮箱密码登录
- 自动检测登录状态并跳转
- 支持从URL参数传递邮箱

#### 5.2 忘记密码 (`forgot-password.tsx`, `forgot-verify.tsx`)
- 发送密码重置邮件
- 验证重置令牌
- 重置密码

#### 5.3 重置密码 (`reset-password.tsx`)
- 使用重置令牌设置新密码

### 6. 个人中心 (`/src/pages/profile/index.tsx`)

个人中心页面，包含：
- **概览标签页**:
  - 用户基本信息（头像、姓名、邮箱）
  - 用户等级和经验值
  - 统计数据概览
- **安全标签页**:
  - 修改密码
  - 设置安全问题（用于密码找回）
  - 查看活跃会话
  - 安全指南

### 7. EchoSpirit 小精灵组件 (`/src/pages/dashboard/EchoSpirit.tsx`)

交互式小精灵组件，支持四种状态：

#### ① idle 状态（主界面/未专注）
- **颜色**: 柔和暖橘 × 温润黄色 × 奶油白光
- **渐变**: `#FFF5E2` → `#FFDFAF` → `#F8D57E` → `#F6B96E`
- **特点**: 温和、萌，像刚醒来的小光球
- **动画**: 轻微浮动、Q弹、柔和光效

#### ② focus 状态（专注界面）
- **颜色**: 蓝绿冷光 × 柔白脉动
- **渐变**: `#D8F5F1` → `#A1E2DA` → `#6EC6B0` → `#4F9D9D`
- **特点**: 安静、沉浸、带禅意
- **动画**: 呼吸式亮度动画（7秒周期，opacity: 0.9 → 0.8 → 0.9）
- **隐藏粒子效果**，保持安静

#### ③ excited/completed 状态（专注完成）
- **颜色**: 明亮金光 × 暖粉 × 柔白星屑
- **渐变**: `#FFF3E0` → `#FFDCA8` → `#FFCF73` → `#FF9E7A`
- **特点**: 庆祝但不浮夸，喜悦发光
- **动画**: Q弹晃动、明亮光效

#### ④ happy 状态（点击互动）
- **特点**: 温和的喜悦状态
- **动画**: 头部轻微晃动、挥手

**交互功能：**
- 单击：随机切换到 happy 或 excited 状态（3秒后恢复）
- 双击：切换 focus 模式
- 通过 `onStateChange` 回调通知状态变化
- 通过 `onClick` 回调触发文案显示

**移动端版本**: `EchoSpiritMobile.tsx` - 适配移动端的小精灵组件

### 8. UserMenu 用户菜单组件 (`/src/pages/dashboard/UserMenu.tsx`)

用户菜单组件，提供：
- 用户头像显示（显示用户名首字母）
- 个人中心入口
- 退出登录功能

**登出功能：**
- 只清除认证相关的 sessionStorage 和 Cookie
- **保留所有核心数据**（总专注时长、历史数据、成就等）
- 清除服务器端 session
- 跳转到首页并传递 `signedOut=true` 参数

### 9. SpiritDialog 对话框组件 (`/src/pages/dashboard/SpiritDialog.tsx`)

小精灵文案对话框组件，功能：
- **文案库**: 45条文案，分为三类
  - 可爱轻松款（15条）
  - 无厘头搞怪款（15条）
  - 轻哲学暖心款（15条）
- **显示机制**:
  - 用户点击小精灵时显示随机文案
  - 专注完成时显示祝贺信息
  - 每日首次进入显示欢迎信息
  - 5秒后自动隐藏
  - 隐藏后进入5秒CD，CD期间点击只触发动画，不显示文案
- **位置**: 小精灵右下方，不覆盖小精灵
- **样式**: 根据文案类型显示不同颜色渐变

**技术实现：**
- 使用 `forwardRef` 和 `useImperativeHandle` 暴露 `showMessage`、`showWelcomeMessage`、`showCompletionMessage` 方法
- 通过 ref 在 dashboard 中调用
- CD机制确保不会频繁显示文案

### 10. BottomNavigation 底部导航 (`/src/pages/dashboard/BottomNavigation.tsx`)

底部导航栏组件，提供：
- **主页**: 跳转到 `/dashboard`
- **专注**: 跳转到 `/focus`
- **计划**: 跳转到 `/plans`
- **心树**: 暂时屏蔽，等待实现

**特性：**
- 固定底部位置
- 高亮当前激活页面
- 响应式设计

### 11. AchievementPanel 成就面板 (`/src/pages/dashboard/AchievementPanel.tsx`)

成就面板组件，功能：
- 显示所有成就（按类别筛选）
- 显示已解锁/未解锁状态
- 显示成就进度
- 支持按类别筛选（全部、初体验、心流、时长、每日、小目标）

## 数据存储

### localStorage 数据结构

#### `userPlans`
存储用户的所有计划：
```typescript
Array<{
  id: string;
  name: string;
  focusBranch?: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    order: number;
  }>;
  isActive: boolean;
  isPrimary?: boolean;
  isCompleted?: boolean;
}>
```

#### `focusSession`
存储当前专注会话：
```typescript
{
  sessionId: string;
  plannedDuration: number;  // 计划时长（分钟）
  elapsedTime: number;      // 已专注时长（秒）
  status: 'preparing' | 'starting' | 'running' | 'paused' | 'completed' | 'interrupted';
  startTime: string;        // ISO格式时间戳
  pauseStart?: string;       // 暂停开始时间戳
  totalPauseTime: number;    // 累计暂停时间（秒）
  pauseCount: number;
  customDuration: number;
}
```

#### `todayStats`
存储今日统计数据（历史记录）：
```typescript
{
  [date: string]: {
    minutes: number;
    date: string;
  }
}
```

#### `weeklyStats`
存储本周统计数据：
```typescript
{
  totalMinutes: number;
  weekStart: string;  // 本周开始日期（周一00:00）
}
```
**重置机制**: 每周一00:00根据用户时区自动重置

#### `dashboardStats`
存储仪表盘统计数据：
```typescript
{
  yesterdayMinutes: number;
  streakDays: number;
  completedGoals: number;
}
```

#### `flowMetrics`
存储心流指标：
```typescript
{
  totalFocusMinutes: number;
  averageSessionLength: number;
  longestSession: number;
  sessionCount: number;
  consistencyScore: number;
  averageRating: number;
  completionRate: number;
  interruptionRate: number;
  currentStreak: number;
  improvementTrend: number;
  impressionScore: number;        // 稳定印象分（35-97）
  tempFlowScore: number;          // 临时心流分（-20-45）
  lastSessionAt?: string | null;
  lastDecayAt?: string | null;
  recentQualityStreak: number;
  lastBehaviorPenaltyAt?: string | null;
}
```

#### `totalFocusMinutes`
存储总专注时长（累计，从使用至今）：
```typescript
string  // 数字字符串，单位为分钟
```

#### `userExp`
存储用户经验值：
```typescript
string  // 数字字符串
```

#### `achievedAchievements`
存储已解锁的成就ID列表：
```typescript
string[]  // 成就ID数组
```

#### `unviewedAchievements`
存储未查看的成就列表：
```typescript
Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}>
```

#### `weeklyBehaviorRecords`
存储每周行为记录（用于心流计算）：
```typescript
{
  [date: string]: {
    date: string;
    present: boolean;
    focused: boolean;
    metGoal: boolean;
    overGoal: boolean;
  }
}
```

#### `dataRecovered`
数据恢复标记：
```typescript
string  // 'true' 表示已恢复过数据
```

#### `lastFocusDate`
最后专注日期：
```typescript
string  // 日期字符串，格式: 'YYYY-MM-DD'
```

#### `lastWelcomeDate`
最后欢迎日期：
```typescript
string  // 日期字符串，格式: 'YYYY-MM-DD'
```

#### `focusCompleted`
专注完成标记：
```typescript
string  // 'true' 表示有未显示的完成信息
```

#### `forceOnboarding`
强制引导流程标记：
```typescript
string  // 'true' 表示强制进入引导流程
```

#### `hasSecurityQuestions`
是否设置安全问题：
```typescript
string  // 'true' 表示已设置
```

#### `securityGuideDismissed`
安全指南是否已关闭：
```typescript
string  // 'true' 表示已关闭
```

#### `loginCount`
登录次数：
```typescript
string  // 数字字符串
```

#### `nextSecurityReminder`
下次安全提醒：
```typescript
string  // 数字字符串（登录次数）
```

### 数据库模型 (Prisma Schema)

#### User
```prisma
model User {
  id                     String         @id
  name                   String?
  email                  String?        @unique
  emailVerified          DateTime?
  image                  String?
  password               String?
  createdAt              DateTime       @default(now())
  updatedAt              DateTime
  hasCompletedOnboarding Boolean        @default(false)
  accounts               Account[]
  sessions               Session[]
  projects               Project[]
  focusSessions          FocusSession[]
}
```

#### Project
```prisma
model Project {
  id                String         @id @default(cuid())
  name              String
  description       String?
  icon              String
  color             String?
  dailyGoalMinutes  Int            @default(25)
  targetDate        DateTime?
  isActive          Boolean        @default(true)
  userId            String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  user              User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones        Milestone[]
  focusSessions     FocusSession[]
}
```

#### Milestone
```prisma
model Milestone {
  id        String   @id @default(cuid())
  title     String
  isCompleted Boolean @default(false)
  order     Int
  projectId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

#### FocusSession
```prisma
model FocusSession {
  id        String   @id @default(cuid())
  startTime DateTime
  endTime   DateTime?
  duration  Int      // 分钟
  note      String?
  rating    Int?
  projectId String?
  userId    String
  project   Project? @relation(fields: [projectId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}
```

### 数据持久性

**重要：登出时数据保留策略**

应用采用**数据持久化**策略，确保用户的核心数据在登出后仍然保留：

#### 登出时保留的数据（localStorage）
以下核心数据在用户登出时**不会被清除**，确保用户重新登录后数据完整：

- **总专注时长**: `totalFocusMinutes` - 累计专注时长（永久记录）
- **历史数据**: `todayStats` - 所有历史日期的专注记录
- **本周数据**: `weeklyStats` - 本周累计专注时长
- **统计数据**: `dashboardStats` - 昨日时长、连续天数、完成目标数
- **心流指标**: `flowMetrics` - 完整的心流指标数据
- **用户计划**: `userPlans` - 所有计划和里程碑
- **经验值**: `userExp` - 用户等级和经验值
- **成就数据**: `achievedAchievements`, `unviewedAchievements` - 已解锁和未查看的成就
- **行为记录**: `weeklyBehaviorRecords` - 每周行为记录
- **数据恢复标记**: `dataRecovered` - 数据恢复状态标记
- **日期标记**: `lastFocusDate`, `lastWelcomeDate` - 最后专注日期和欢迎日期
- **UI状态**: `focusCompleted` - 专注完成标记（可选清除）
- **安全相关**: `hasSecurityQuestions`, `securityGuideDismissed`, `loginCount`, `nextSecurityReminder` - 安全提示相关数据

#### 登出时清除的数据
- **sessionStorage**: 所有会话存储数据（认证相关）
- **认证 Cookie**: NextAuth 相关的所有 Cookie
- **服务器端 Session**: 通过 NextAuth 的 `signOut` 清除

#### 实现位置
登出逻辑位于 `/src/pages/dashboard/UserMenu.tsx` 的 `handleSignOut` 函数中。

**设计理念**: 用户的专注数据是宝贵的成长记录，不应该因为登出而丢失。只有认证相关的临时数据会被清除，确保安全性的同时保护用户数据。

## 页面路由

### 主要页面

- `/` - 首页（Landing Page）
- `/dashboard` - 主仪表盘
- `/focus` - 专注计时器
- `/plans` - 计划管理
- `/profile` - 个人中心
- `/onboarding` - 引导流程入口
- `/onboarding/goal-setting` - 目标设定（创建/编辑计划）
- `/onboarding/focus-selection` - 兴趣选择
- `/auth/signin` - 登录/注册
- `/auth/forgot-password` - 忘记密码
- `/auth/forgot-verify` - 验证重置令牌
- `/auth/reset-password` - 重置密码
- `/legal/privacy` - 隐私政策
- `/legal/terms` - 服务条款

### 路由参数

#### `/onboarding/goal-setting`
- `interestId` - 兴趣ID
- `interestName` - 兴趣名称
- `interestIcon` - 兴趣图标
- `editPlanId` - 编辑模式下的计划ID（可选）
- `from` - 来源页面（'plans' 等）
- `allowReturn` - 是否允许返回（'1' 表示允许）

#### `/?signedOut=true`
- 登出后的重定向参数，用于显示欢迎界面

## API 路由

### 认证相关 (`/api/auth/`)

- `[...nextauth]` - NextAuth 配置
- `register.ts` - 用户注册
- `signout.ts` - 登出
- `forgot.ts` - 发送密码重置邮件
- `forgot/verify.ts` - 验证重置令牌
- `reset.ts` - 重置密码

### 用户相关 (`/api/user/`)

- `profile.ts` - 获取/更新用户资料
- `complete-onboarding.ts` - 完成引导流程
- `change-password.ts` - 修改密码
- `sessions.ts` - 获取活跃会话
- `security/set-recovery.ts` - 设置安全问题

### 项目相关 (`/api/projects/`)

- `index.ts` - 获取/创建项目

### 评论相关 (`/api/comments/`)

- `create.ts` - 创建评论
- `list.ts` - 获取评论列表

## 组件架构

### 核心组件

1. **EchoSpirit** - 小精灵组件
   - 位置: `/src/pages/dashboard/EchoSpirit.tsx`
   - 状态: idle, excited, focus, happy
   - 支持状态变化回调和点击回调

2. **EchoSpiritMobile** - 移动端小精灵组件
   - 位置: `/src/pages/dashboard/EchoSpiritMobile.tsx`
   - 适配移动端显示

3. **SpiritDialog** - 文案对话框
   - 位置: `/src/pages/dashboard/SpiritDialog.tsx`
   - 通过 ref 暴露 `showMessage`、`showWelcomeMessage`、`showCompletionMessage` 方法
   - 5秒CD机制

4. **PlanCard** - 计划卡片
   - 位置: `/src/pages/plans/PlanCard.tsx`
   - 显示计划信息、小目标列表
   - 支持编辑、添加小目标操作

5. **PlanManagement** - 计划管理底部栏
   - 位置: `/src/pages/plans/PlanManagement.tsx`
   - 显示选中计划的操作按钮

6. **ProgressRing** - 环形进度图
   - 位置: `/src/pages/dashboard/ProgressRing.tsx`
   - 显示今日完成进度

7. **BottomNavigation** - 底部导航栏
   - 位置: `/src/pages/dashboard/BottomNavigation.tsx`
   - 提供主要页面导航

8. **AchievementPanel** - 成就面板
   - 位置: `/src/pages/dashboard/AchievementPanel.tsx`
   - 显示所有成就，支持分类筛选

9. **UserMenu** - 用户菜单
   - 位置: `/src/pages/dashboard/UserMenu.tsx`
   - 用户头像、个人中心、登出功能

10. **PrimaryPlanCard** - 主要计划卡片
    - 位置: `/src/pages/dashboard/PrimaryPlanCard.tsx`
    - 显示当前主要计划

11. **SecurityGuideCard** - 安全指南卡片
    - 位置: `/src/pages/dashboard/SecurityGuideCard.tsx`
    - 提醒用户设置安全问题

12. **QuickSearchGuide** - 快速查找指南
    - 位置: `/src/pages/dashboard/QuickSearchGuide.tsx`
    - 帮助用户快速上手

13. **InterruptedSessionAlert** - 中断会话提示
    - 位置: `/src/pages/focus/InterruptedSessionAlert.tsx`
    - 检测并提示恢复中断的会话

14. **InterestGrid** - 兴趣网格
    - 位置: `/src/components/onboarding/InterestGrid.tsx`
    - 显示兴趣选择网格

## 核心库系统

### 1. AchievementSystem (`/src/lib/AchievementSystem.tsx`)

成就系统管理器，功能：
- 管理所有成就定义
- 检查并解锁成就
- 持久化已解锁成就
- 提供成就统计信息

**成就类型：**
- `first` - 首次成就（如第一次专注）
- `flow` - 心流相关（心流指数达到特定值）
- `time` - 时长相关（累计专注时长达到里程碑）
- `daily` - 每日相关（单日专注时长达到目标）
- `milestone` - 小目标相关（完成小目标数量）

**成就检查方法：**
- `checkFlowIndexAchievements(score)` - 检查心流指数成就
- `checkTotalTimeAchievements(hours)` - 检查总时长成就
- `checkDailyTimeAchievements(hours)` - 检查每日时长成就
- `checkMilestoneAchievements(count)` - 检查小目标成就
- `checkFirstTimeAchievements(type)` - 检查首次成就

### 2. LevelSystem (`/src/lib/LevelSystem.tsx`)

等级系统管理器，功能：
- 计算用户等级和经验值
- 提供等级称号和颜色
- 计算经验值需求

**等级称号：**
- 1-10: 专注新人、时间学徒、新手毕业
- 11-20: 进阶学者、心流探索者、进阶认证
- 21-30: 熟练工、专注专家、时间管理者
- 31-40: 领域专家、心流大师、专家认证
- 41-50: 大师之路、金牌策划、时间大师
- 51-60: 宗师之路、传奇之路、时间夺还者
- 61+: 传奇诞生、史诗传说、神话归来、时间之神

**经验值获取：**
- 专注完成: 根据时长、评分、连续天数计算
- 小目标完成: 每个5 EXP
- 成就解锁: 每个20 EXP

**等级颜色：**
- 1-10: 灰色 (#9CA3AF)
- 11-20: 绿色 (#10B981)
- 21-30: 蓝色 (#3B82F6)
- 31-40: 紫色 (#8B5CF6)
- 41-50: 金色 (#F59E0B)
- 51-60: 钻石渐变
- 61+: 传奇渐变

### 3. flowEngine (`/src/lib/flowEngine.ts`)

心流引擎，功能：
- 计算心流指数（0-100）
- 管理稳定印象分和临时心流分
- 应用衰减和冷却机制
- 计算周行为得分

**心流指数计算：**
- **质量维度**: 基于平均评分、完成率、中断率
- **时长维度**: 基于总时长、平均时长、最长时长
- **一致性维度**: 基于连续天数、会话频率

**心流等级：**
- 0-40: 萌芽
- 41-55: 初识心流
- 56-70: 探索心流
- 71-85: 成长心流
- 86-95: 稳定心流
- 96-100: 大师心流

**衰减机制：**
- 临时心流分每小时衰减（1小时内不衰减，1-12小时慢速衰减，12-48小时中速衰减，48小时以上快速衰减）
- 印象分冷却（长时间不专注会缓慢下降）

**行为得分：**
- 每日行为得分 = 出现(1分) + 专注(3分) + 达成目标(8分) + 超额完成(10分)
- 周行为得分 = 7天行为得分总和，归一化到0-1

## 动画系统

### EchoSpirit 动画

#### idle 状态
- `floatY`: 垂直浮动（3.8s）
- `headTilt`: 头部倾斜（4s）
- `mochiBounce`: Q弹效果（4.5s）
- `elasticSquish`: 弹性变形（3.2s）
- `lookLeftUp`: 眼睛左上看（5s）

#### focus 状态
- `floatY`: 垂直浮动（6.5s，更慢）
- `headTilt`: 头部倾斜（8s，更慢）
- `mochiBounce`: Q弹效果（7s，更慢）
- `elasticSquish`: 弹性变形（6.8s，更慢）
- `lookLeftUp`: 眼睛左上看（7s，更慢）
- `focusBreath`: 呼吸动画（7s，opacity: 0.9 → 0.8 → 0.9）

#### excited 状态
- `excitedBounce`: 到处Q弹乱晃（2s）
- `floatY`: 垂直浮动（2s）
- `headTilt`: 头部倾斜（2s）
- `mochiBounce`: Q弹效果（2s）
- `headBounce`: 头部弹跳（2s）
- `elasticSquish`: 弹性变形（2s）
- `lookAround`: 眼睛到处乱看（2s）

#### happy 状态
- `headShake`: 左右轻微晃脑袋（2s）
- `mochiBounce`: Q弹效果（2s）
- `elasticSquish`: 弹性变形（2s）
- `highlightRun`: 高光跑动（2s）
- `wave`: 挥手动画（2s）

## 数据流

### 专注完成流程

1. 用户在 `/focus` 页面完成专注
2. 调用 `endFocus(completed)`
3. 计算最终已专注时长（基于时间戳）
4. 调用 `window.reportFocusSessionComplete(minutes, rating, completed)`
5. Dashboard 接收回调，更新统计数据：
   - 更新今日数据 (`todayStats`)
   - 更新本周数据 (`weeklyStats`)
   - 更新总专注时长 (`totalFocusMinutes`)
   - 更新心流指标 (`flowMetrics`)
   - 更新用户经验值 (`userExp`)
   - 检查并解锁成就
   - 更新行为记录 (`weeklyBehaviorRecords`)
6. 如果完成，设置小精灵为 `excited` 状态
7. 显示完成祝贺信息

### 计划编辑流程

1. 用户在 `/plans` 页面点击编辑
2. 跳转到 `/onboarding/goal-setting`，传递 `editPlanId` 和 `from: 'plans'`
3. 加载计划数据到表单
4. 用户修改后提交
5. 更新 localStorage 中的计划数据 (`userPlans`)
6. 点击返回 → 直接返回到 `/plans` 页面（不是三选一界面）

### 新用户注册流程

1. 用户在 `/auth/signin` 注册账号
2. 注册成功后自动登录
3. 检查 `hasCompletedOnboarding` 状态
4. 如果未完成，跳转到 `/onboarding`
5. 选择兴趣 → 设定目标 → 创建第一个计划
6. 标记 `hasCompletedOnboarding = true`
7. 跳转到 `/dashboard`

### 登出流程

1. 用户点击登出按钮
2. 清除 sessionStorage（认证相关）
3. 清除认证 Cookie
4. 调用 NextAuth 的 `signOut` 清除服务器端 session
5. **保留所有 localStorage 核心数据**
6. 跳转到 `/?signedOut=true`
7. 首页检测到 `signedOut` 参数，显示欢迎界面

## 样式系统

### 颜色主题

#### idle 状态（柔和暖光）
- 主色: `#F8D57E`, `#F6B96E`
- 背景: `#FFF5E2`, `#FFDFAF`
- 阴影: `#F6B96E` (15% opacity)

#### focus 状态（蓝绿冷光）
- 主色: `#6EC6B0`, `#4F9D9D`
- 背景: `#D8F5F1`, `#A1E2DA`
- 阴影: `#6EC6B0` (20% opacity)

#### completed 状态（明亮金光）
- 主色: `#FFCF73`, `#FF9E7A`
- 背景: `#FFF3E0`, `#FFDCA8`
- 阴影: `#FFCF73` (25% opacity)

### 全局样式

- 使用 Tailwind CSS 4.0
- 响应式设计（移动端优先）
- 支持深色模式（待实现）
- 自定义动画和过渡效果

## 性能优化

1. **useMemo**: 缓存计算结果（如心流指数、用户等级）
2. **useCallback**: 稳定函数引用（如文案显示函数）
3. **localStorage 同步**: 定期保存，避免频繁写入
4. **动画优化**: 使用 CSS 动画而非 JavaScript 动画
5. **状态管理**: 使用 ref 避免不必要的重渲染
6. **代码分割**: Next.js 自动代码分割
7. **图片优化**: Next.js Image 组件优化

## 安全特性

1. **密码加密**: 使用 bcryptjs 加密存储密码
2. **会话管理**: NextAuth.js 管理用户会话
3. **CSRF 保护**: NextAuth.js 内置 CSRF 保护
4. **安全问题**: 支持设置安全问题用于密码找回
5. **活跃会话管理**: 用户可以查看和管理活跃会话
6. **密码重置**: 安全的密码重置流程（邮件验证）

## 待实现功能

1. **心树功能**: 已创建组件但功能暂时屏蔽，等待实现
2. **数据导出**: 导出用户数据（专注记录、统计数据等）
3. **数据同步**: 服务器端数据同步（目前主要使用 localStorage）
4. **深色模式**: 支持深色主题
5. **专注统计图表**: 更详细的数据可视化
6. **计划回顾**: 回顾已完成计划的统计数据
7. **社交功能**: 分享成就、排行榜等（如果计划实现）

## 注意事项

1. **时间戳计算**: 专注时长使用时间戳计算，确保后台挂起时也能准确计时
2. **状态同步**: 多个页面共享 localStorage 数据，需要注意实时同步
3. **24小时过期**: 专注会话超过24小时会自动清理
4. **CD机制**: 文案对话框有5秒CD，避免频繁显示
5. **编辑模式**: 编辑计划时返回按钮会直接返回到计划页面
6. **数据持久性**: 登出时只清除认证相关数据，所有核心数据（总专注时长、历史记录、成就等）都会保留，确保用户重新登录后数据完整
7. **数据恢复**: Dashboard 组件挂载时会自动从 `flowMetrics` 和 `todayStats` 恢复总专注时长数据（如果 `totalFocusMinutes` 为0）
8. **周数据重置**: 每周一00:00根据用户时区自动重置本周专注时长
9. **日期归档**: 新的一天开始时，自动归档昨日数据到统计数据
10. **成就检查**: 成就检查在多个时机触发，确保不会遗漏解锁
11. **经验值计算**: 经验值计算考虑时长、评分、连续天数等多个因素
12. **心流衰减**: 心流指标会随时间衰减，鼓励用户持续专注

## 开发指南

### 环境变量

需要配置以下环境变量：
- `DATABASE_URL` - PostgreSQL 数据库连接字符串
- `NEXTAUTH_SECRET` - NextAuth 密钥
- `NEXTAUTH_URL` - 应用URL（生产环境）

### 数据库迁移

```bash
# 开发环境迁移
npm run db:generate

# 生产环境迁移
npm run db:migrate

# 推送数据库变更（开发）
npm run db:push
```

### 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 类型检查
npm run typecheck
```

### 代码规范

- 使用 TypeScript 严格模式
- 组件使用函数式组件和 Hooks
- 样式使用 Tailwind CSS
- 遵循 React 最佳实践
- 使用 ESLint 和 Prettier（如果配置）
