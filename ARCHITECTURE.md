# 项目架构文档

> 最后更新：2024年

## 📁 项目结构

```
t3-app/
├── src/
│   ├── pages/
│   │   ├── dashboard/          # 主面板模块
│   │   │   ├── index.tsx       # 主面板入口
│   │   │   ├── BottomNavigation.tsx    # 底部导航栏
│   │   │   ├── PrimaryPlanCard.tsx     # 主要计划卡片
│   │   │   ├── ProgressRing.tsx        # 进度环形图
│   │   │   ├── UserMenu.tsx           # 用户菜单
│   │   │   ├── AchievementTypes.ts    # 成就类型定义
│   │   │   ├── AchievementSystem.ts   # 成就系统逻辑
│   │   │   ├── AchievementPanel.tsx   # 成就面板组件
│   │   │   └── ACHIEVEMENT_README.md  # 成就系统说明
│   │   ├── focus/              # 专注模块
│   │   │   ├── index.tsx       # 专注页面入口
│   │   │   ├── FocusSummary.tsx       # 专注小结
│   │   │   └── FocusSummaryModal.tsx  # 小结弹窗
│   │   ├── plans/              # 计划管理模块
│   │   │   └── index.tsx
│   │   ├── auth/               # 认证模块
│   │   └── onboarding/         # 新手引导
│   ├── components/             # 公共组件
│   ├── types/                  # TypeScript 类型定义
│   └── styles/                 # 全局样式
├── public/                     # 静态资源
├── ARCHITECTURE.md            # 架构文档（本文件）
└── package.json
```

## 🎯 核心模块

### 1. Dashboard（主面板）

**功能概览**：
- 用户数据总览（今日专注、本周专注、连续天数、心流指数）
- 主要计划展示与小目标管理
- 成就系统入口
- 周报小结展示

**关键文件**：
- `dashboard/index.tsx` - 主入口，包含所有数据逻辑和状态管理
- `dashboard/PrimaryPlanCard.tsx` - 主要计划卡片，支持小目标多选和展开
- `dashboard/AchievementSystem.ts` - 成就系统核心逻辑

**数据流程**：
```
用户操作 → localStorage更新 → React State更新 → UI渲染
```

### 2. Focus（专注功能）

**功能概览**：
- 准备专注（选择计划、设置小目标）
- 专注计时器（3秒倒计时 → 开始计时）
- 专注过程中（显示进度环、暂停功能）
- 专注完成（显示小结界面）

**关键文件**：
- `focus/index.tsx` - 专注页面，包含所有专注流程状态机

**状态流程**：
```
preparing（准备） → starting（倒计时） → running（专注中） → completed（完成）
                                      ↓
                                   paused（暂停）
```

### 3. Plans（计划管理）

**功能概览**：
- 创建和管理专注计划
- 设置每日目标时长
- 添加和管理小目标

### 4. Achievement System（成就系统）

**功能概览**：
- 8种成就类型（心流指数、时长、小目标等）
- 6个稀有度等级
- 实时进度追踪
- 成就通知

**关键文件**：
- `dashboard/AchievementTypes.ts` - 所有成就定义
- `dashboard/AchievementSystem.ts` - 成就检测和更新逻辑
- `dashboard/AchievementPanel.tsx` - 成就展示面板

详见：[成就系统说明](./src/pages/dashboard/ACHIEVEMENT_README.md)

## 📊 数据存储方案

### localStorage 键值表

| Key | 数据类型 | 说明 |
|-----|---------|------|
| `userPlans` | Project[] | 用户的所有计划 |
| `dashboardStats` | DashboardStats | 统计数据（今日、本周、连续天数等） |
| `flowMetrics` | FlowMetrics | 心流指标数据 |
| `focusSession` | FocusSession | 当前专注会话状态 |
| `recentFocusSummary` | object | 最近的专注小结 |
| `lastFocusRating` | number | 最后一次专注评分 |
| `lastFocusDate` | string | 最后专注日期（用于计算连续天数） |
| `achievements` | Achievement[] | 成就数据和进度 |

### 数据结构

#### Project（计划）
```typescript
interface Project {
  id: string;
  name: string;
  icon: string;
  dailyGoalMinutes: number;
  milestones: Milestone[];
  isActive: boolean;
  isPrimary?: boolean;
}
```

#### DashboardStats（统计）
```typescript
interface DashboardStats {
  todayMinutes: number;
  todayGoal: number;
  weeklyMinutes: number;
  streakDays: number;
  completedGoals: number;
}
```

#### FocusSession（专注会话）
```typescript
interface FocusSession {
  sessionId: string;
  plannedDuration: number;
  elapsedTime: number;
  status: FocusState;
  startTime: string;
  pauseStart?: string;
  pauseCount: number;
  customDuration: number;
}
```

## 🔄 数据流

### 专注完成流程

```
focus/index.tsx（专注完成）
  ↓
保存小结到localStorage
  ↓
调用 window.reportFocusSessionComplete(minutes, rating)
  ↓
dashboard/index.tsx（handleFocusSessionComplete）
  ↓
更新 stats（todayMinutes, weeklyMinutes, streakDays）
  ↓
保存到 localStorage['dashboardStats']
  ↓
更新 UI（ProgressRing、统计卡片）
```

### 小目标完成流程

```
dashboard/PrimaryPlanCard.tsx（勾选小目标）
  ↓
调用 onBulkMilestoneToggle(milestoneIds)
  ↓
dashboard/index.tsx（handleBulkMilestoneToggle）
  ↓
更新 primaryPlan.milestones
  ↓
保存到 localStorage['userPlans']
  ↓
更新 UI（小目标标记为完成）
```

### 成就检测流程

```
dashboard/index.tsx（useEffect）
  ↓
读取 stats、flowIndex
  ↓
AchievementManager.check...Achievements()
  ↓
返回新获得的成就
  ↓
显示 AchievementNotification
```

## 🎨 状态管理

### Dashboard State

```typescript
// 用户数据
const [stats, setStats] = useState<DashboardStats>({...});
const [primaryPlan, setPrimaryPlan] = useState<Project | null>(null);

// UI状态
const [isLoading, setIsLoading] = useState(true);
const [showAchievementPanel, setShowAchievementPanel] = useState(false);

// 成就系统
const [achievementManager, setAchievementManager] = useState<AchievementManager | null>(null);
const [newAchievements, setNewAchievements] = useState<any[]>([]);
```

### Focus State

```typescript
// 专注状态
const [state, setState] = useState<FocusState>('preparing');

// 计时相关
const [elapsedTime, setElapsedTime] = useState(0);
const [plannedMinutes, setPlannedMinutes] = useState(30);
const [countdown, setCountdown] = useState(3);

// 小目标
const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
const [planMilestones, setPlanMilestones] = useState<Array<...>>([]);
const [customGoals, setCustomGoals] = useState<Array<...>>([]);
```

## 🔍 问题排查指南

### 1. 数据不更新

**症状**：修改数据后UI没有变化

**排查步骤**：
1. 检查 localStorage 是否保存成功
   ```javascript
   console.log(localStorage.getItem('dashboardStats'));
   ```
2. 检查 React State 是否更新
3. 检查组件的依赖数组是否完整

**常见原因**：
- useEffect 依赖数组缺少关键依赖
- State 更新后被其他逻辑覆盖
- localStorage 保存失败

### 2. 专注会话丢失

**症状**：刷新页面后专注进度丢失

**排查步骤**：
1. 检查 `focusSession` 是否在 localStorage 中
2. 检查 `FocusSession` 类型定义是否正确
3. 检查恢复逻辑是否正常执行

**常见原因**：
- 页面刷新时 localStorage 被清空
- 时间戳验证逻辑导致会话被清理
- 状态机转换错误

### 3. 小目标无法完成

**症状**：勾选小目标后没有反应

**排查步骤**：
1. 检查 `onBulkMilestoneToggle` 是否正确传递
2. 检查 `handleBulkMilestoneToggle` 函数逻辑
3. 检查 localStorage 更新是否成功
4. 检查 milestone ID 是否匹配

**常见原因**：
- Props 传递链路中断
- ID 类型不匹配（string vs number）
- 异步更新问题

### 4. 成就系统问题

**症状**：成就不触发或数据丢失

**排查步骤**：
1. 检查 AchievementManager 初始化
2. 检查成就检测函数是否正确调用
3. 检查 localStorage['achievements'] 数据
4. 检查目标值（target）是否合理

**常见原因**：
- 成就进度计算错误
- 目标值与实际值不匹配
- localStorage 数据损坏

### 5. 心流指数计算异常

**症状**：心流指数显示不正确

**排查步骤**：
1. 检查 `flowMetrics` 数据完整性
2. 检查 `calculateFlowIndex()` 函数逻辑
3. 检查标准化函数 `normalize()`
4. 检查权重配置是否合理

**常见原因**：
- flowMetrics 数据缺失
- 计算逻辑错误
- 权重配置不合理

## 🔧 开发指南

### 添加新功能

1. **创建新页面**
   ```bash
   # 在 pages/ 下创建新目录
   mkdir pages/new-feature
   touch pages/new-feature/index.tsx
   ```

2. **添加新数据存储**
   ```typescript
   // 在 localStorage 中保存数据
   localStorage.setItem('newFeatureData', JSON.stringify(data));
   
   // 读取数据
   const data = JSON.parse(localStorage.getItem('newFeatureData') || '{}');
   ```

3. **添加新成就**
   ```typescript
   // 在 AchievementTypes.ts 中添加
   export const NEW_ACHIEVEMENTS: Achievement[] = [
     { id: 'new_1', name: '新成就', ... }
   ];
   
   // 添加到 ALL_ACHIEVEMENTS
   export const ALL_ACHIEVEMENTS: Achievement[] = [
     ...previous,
     ...NEW_ACHIEVEMENTS,
   ];
   ```

### 修改现有功能

1. **修改统计数据**
   - 文件：`dashboard/index.tsx`
   - 查找：`DashboardStats` 接口
   - 更新：state 初始化、保存逻辑

2. **修改专注流程**
   - 文件：`focus/index.tsx`
   - 查找：`FocusState` 枚举
   - 更新：状态转换逻辑

3. **修改UI样式**
   - 文件：对应的组件文件
   - 使用 Tailwind CSS 类名
   - 添加自定义动画见 `style jsx` 块

## 📝 重要约定

1. **命名规范**
   - 组件：PascalCase（如 `PrimaryPlanCard`）
   - 函数：camelCase（如 `handleMilestoneToggle`）
   - 接口：PascalCase（如 `DashboardStats`）
   - 常量：UPPER_SNAKE_CASE（如 `ACHIEVEMENT_COLORSCTS`）

2. **文件组织**
   - 每个页面/功能一个目录
   - 相关组件放在同一目录
   - 类型定义在文件顶部或单独文件

3. **状态管理**
   - 优先使用 useState
   - 复杂逻辑使用 useMemo、useCallback
   - 全局状态考虑 Context API

4. **数据持久化**
   - 所有用户数据保存在 localStorage
   - 使用 JSON.stringify/parse 转换
   - 提供默认值以防数据丢失

## 🚨 常见陷阱

1. **直接修改 State**
   ```typescript
   // ❌ 错误
   stats.todayMinutes = 100;
   
   // ✅ 正确
   setStats({ ...stats, todayMinutes: 100 });
   ```

2. **忘记 useEffect 依赖**
   ```typescript
   // ❌ 可能有问题
   useEffect(() => {
     doSomething(stats);
   }, []);
   
   // ✅ 正确
   useEffect(() => {
     doSomething(stats);
   }, [stats]);
   ```

3. **异步 State 更新**
   ```typescript
   // ❌ 可能使用旧值
   setStats({ ...stats, todayMinutes: stats.todayMinutes + 10 });
   
   // ✅ 使用函数形式
   setStats(prev => ({ ...prev, todayMinutes: prev.todayMinutes + 10 }));
   ```

## 🎓 学习资源

- [Next.js 文档](https://nextjs.org/docs)
- [React Hooks 指南](https://react.dev/reference/react)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📞 联系方式

遇到问题？请查看对应模块的 README 文件：
- 成就系统：[ACHIEVEMENT_README.md](./src/pages/dashboard/ACHIEVEMENT_README.md)
- 专注功能：查看 `focus/index.tsx` 注释
- 主面板：查看 `dashboard/index.tsx` 注释

---

**维护者**：请保持文档更新，修改重要功能时同步更新此文件。

















