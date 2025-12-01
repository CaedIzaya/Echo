# 项目架构文档

## 项目概述

这是一个基于 Next.js 的专注时间管理应用，提供计划管理、专注计时、成就系统等功能。

## 技术栈

- **框架**: Next.js (React)
- **认证**: NextAuth.js
- **状态管理**: React Hooks + localStorage
- **样式**: Tailwind CSS
- **类型**: TypeScript

## 核心功能模块

### 1. 专注计时器 (`/src/pages/focus/index.tsx`)

专注计时器的核心功能，支持：
- 准备状态：设置专注时长、选择计划、设置小目标
- 3秒倒计时
- 专注进行中：基于时间戳的计时，避免后台挂起时计时不准
- 暂停/恢复功能（限制暂停次数）
- 完成/中断状态
- 自动保存到 localStorage
- 24小时过期机制

**关键特性：**
- 使用时间戳计算已专注时长，确保准确性
- 支持超额完成（超过目标时长显示金色背景）
- 自动同步到 dashboard 统计数据

### 2. Dashboard (`/src/pages/dashboard/index.tsx`)

主仪表盘页面，显示：
- 今日完成进度（环形进度图）
- 用户等级和经验值
- 连续专注天数
- 本周专注时长
- 小目标完成数
- 心流指数（可展开查看详细分解）
- 最近成就展示
- 主要计划卡片

**数据同步：**
- 通过 `window.reportFocusSessionComplete` 接收专注完成回调
- 实时更新今日和本周统计数据
- 自动归档昨日数据

### 3. 计划管理 (`/src/pages/plans/index.tsx`)

计划管理页面，支持：
- 浏览所有计划（活跃和已完成）
- 创建新计划（跳转到 onboarding 流程）
- 编辑计划（跳转到 goal-setting 页面）
- 管理计划（设置主要、删除、完成）
- 添加小目标

**编辑计划流程：**
- 点击编辑 → 跳转到 `/onboarding/goal-setting`，传递 `editPlanId` 和 `from: 'plans'`
- 编辑完成后返回 → 直接返回到 `/plans` 页面（不是三选一界面）

### 4. EchoSpirit 小精灵组件 (`/src/pages/dashboard/EchoSpirit.tsx`)

交互式小精灵组件，支持三种状态：

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

**交互功能：**
- 单击：随机切换到 happy 或 excited 状态（3秒后恢复）
- 双击：切换 focus 模式
- 通过 `onStateChange` 回调通知状态变化
- 通过 `onClick` 回调触发文案显示

### 5. UserMenu 用户菜单组件 (`/src/pages/dashboard/UserMenu.tsx`)

用户菜单组件，提供：
- 用户头像显示
- 个人中心入口
- 退出登录功能

**登出功能：**
- 只清除认证相关的 sessionStorage 和 Cookie
- **保留所有核心数据**（总专注时长、历史数据、成就等）
- 清除服务器端 session
- 跳转到首页并传递 `signedOut=true` 参数

### 6. SpiritDialog 对话框组件 (`/src/pages/dashboard/SpiritDialog.tsx`)

小精灵文案对话框组件，功能：
- **文案库**: 45条文案，分为三类
  - 可爱轻松款（15条）
  - 无厘头搞怪款（15条）
  - 轻哲学暖心款（15条）
- **显示机制**:
  - 用户点击小精灵时显示随机文案
  - 5秒后自动隐藏
  - 隐藏后进入5秒CD，CD期间点击只触发动画，不显示文案
- **位置**: 小精灵右下方，不覆盖小精灵
- **样式**: 根据文案类型显示不同颜色渐变

**技术实现：**
- 使用 `forwardRef` 和 `useImperativeHandle` 暴露 `showMessage` 方法
- 通过 ref 在 dashboard 中调用
- CD机制确保不会频繁显示文案

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
存储今日统计数据：
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
  weekStart: string;  // 本周开始日期
}
```

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

- `/dashboard` - 主仪表盘
- `/focus` - 专注计时器
- `/plans` - 计划管理
- `/onboarding/goal-setting` - 目标设定（创建/编辑计划）
- `/onboarding/focus-selection` - 兴趣选择

### 路由参数

#### `/onboarding/goal-setting`
- `interestId` - 兴趣ID
- `interestName` - 兴趣名称
- `interestIcon` - 兴趣图标
- `editPlanId` - 编辑模式下的计划ID（可选）
- `from` - 来源页面（'plans' 等）
- `allowReturn` - 是否允许返回（'1' 表示允许）

## 组件架构

### 核心组件

1. **EchoSpirit** - 小精灵组件
   - 位置: `/src/pages/dashboard/EchoSpirit.tsx`
   - 状态: idle, excited, focus, happy
   - 支持状态变化回调和点击回调

2. **SpiritDialog** - 文案对话框
   - 位置: `/src/pages/dashboard/SpiritDialog.tsx`
   - 通过 ref 暴露 `showMessage` 方法
   - 5秒CD机制

3. **PlanCard** - 计划卡片
   - 位置: `/src/pages/plans/PlanCard.tsx`
   - 显示计划信息、小目标列表
   - 支持编辑、添加小目标操作

4. **PlanManagement** - 计划管理底部栏
   - 位置: `/src/pages/plans/PlanManagement.tsx`
   - 显示选中计划的操作按钮

5. **ProgressRing** - 环形进度图
   - 位置: `/src/pages/dashboard/ProgressRing.tsx`
   - 显示今日完成进度

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

## 成就系统

### 成就类型

- `first` - 首次成就
- `flow` - 心流相关
- `time` - 时长相关
- `daily` - 每日相关
- `milestone` - 小目标相关

### 成就检查时机

- 页面加载时检查所有成就
- 专注完成时检查时长相关成就
- 小目标完成时检查里程碑成就
- 心流指数变化时检查心流相关成就

## 等级系统

### 经验值获取

- **专注完成**: 根据时长和评分计算
- **小目标完成**: 每个5 EXP
- **成就解锁**: 每个20 EXP

### 等级计算

使用 `LevelManager.calculateLevel(exp)` 计算当前等级和进度。

## 关键功能实现

### 1. 专注计时器的时间戳机制

使用基于时间戳的计算方式，避免后台挂起时计时不准：

```typescript
const calculateElapsedTime = (
  startTimeStr: string,
  totalPause: number,
  isCurrentlyPaused: boolean,
  pauseStartStr?: string
): number => {
  const startTime = new Date(startTimeStr).getTime();
  const now = new Date().getTime();
  let totalElapsed = Math.floor((now - startTime) / 1000);
  totalElapsed -= totalPause;
  if (isCurrentlyPaused && pauseStartStr) {
    const pauseStart = new Date(pauseStartStr).getTime();
    const currentPauseTime = Math.floor((now - pauseStart) / 1000);
    totalElapsed -= currentPauseTime;
  }
  return Math.max(0, totalElapsed);
};
```

### 2. 小精灵状态切换

通过 `data-state` 属性控制不同状态的显示：

```css
/* 根据状态显示/隐藏不同的头部和光晕 */
.echo-spirit-wrap[data-state="idle"] .head-wrap-idle,
.echo-spirit-wrap[data-state="idle"] .glow-bg-idle {
  opacity: 1;
}

.echo-spirit-wrap[data-state="focus"] .head-wrap-focus,
.echo-spirit-wrap[data-state="focus"] .glow-bg-focus {
  opacity: 1;
}

.echo-spirit-wrap[data-state="excited"] .head-wrap-completed,
.echo-spirit-wrap[data-state="excited"] .glow-bg-completed {
  opacity: 1;
}
```

### 3. 文案对话框CD机制

使用 `isInCooldown` 状态和定时器实现5秒CD：

```typescript
const showMessage = useCallback(() => {
  if (isInCooldown) return;
  // 显示文案
  // 5秒后隐藏并进入CD
  timerRef.current = setTimeout(() => {
    setIsVisible(false);
    setIsInCooldown(true);
    cooldownTimerRef.current = setTimeout(() => {
      setIsInCooldown(false);
    }, 5000);
  }, 5000);
}, [isInCooldown]);
```

## 数据流

### 专注完成流程

1. 用户在 `/focus` 页面完成专注
2. 调用 `endFocus(completed)`
3. 计算最终已专注时长（基于时间戳）
4. 调用 `window.reportFocusSessionComplete(minutes, rating, completed)`
5. Dashboard 接收回调，更新统计数据
6. 如果完成，设置小精灵为 `excited` 状态

### 计划编辑流程

1. 用户在 `/plans` 页面点击编辑
2. 跳转到 `/onboarding/goal-setting`，传递 `editPlanId` 和 `from: 'plans'`
3. 加载计划数据到表单
4. 用户修改后提交
5. 更新 localStorage 中的计划数据
6. 点击返回 → 直接返回到 `/plans` 页面

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

## 性能优化

1. **useMemo**: 缓存计算结果（如心流指数、用户等级）
2. **useCallback**: 稳定函数引用（如文案显示函数）
3. **localStorage 同步**: 定期保存，避免频繁写入
4. **动画优化**: 使用 CSS 动画而非 JavaScript 动画
5. **状态管理**: 使用 ref 避免不必要的重渲染

## 待实现功能

1. focus 状态的小精灵集成到专注计时器页面
2. 计划回顾功能
3. 心树功能（已屏蔽，等待实现）
4. 成就详情页面
5. 数据导出功能

## 注意事项

1. **时间戳计算**: 专注时长使用时间戳计算，确保后台挂起时也能准确计时
2. **状态同步**: 多个页面共享 localStorage 数据，需要注意实时同步
3. **24小时过期**: 专注会话超过24小时会自动清理
4. **CD机制**: 文案对话框有5秒CD，避免频繁显示
5. **编辑模式**: 编辑计划时返回按钮会直接返回到计划页面
6. **数据持久性**: 登出时只清除认证相关数据，所有核心数据（总专注时长、历史记录、成就等）都会保留，确保用户重新登录后数据完整
7. **数据恢复**: Dashboard 组件挂载时会自动从 `flowMetrics` 和 `todayStats` 恢复总专注时长数据（如果 `totalFocusMinutes` 为0）
