# 数据迁移状态报告

## 📊 迁移状态总览

| 数据类型 | 数据库表 | 当前使用 | 迁移状态 | 优先级 |
|---------|---------|---------|---------|--------|
| 用户经验 | ✅ User.userExp | ✅ 数据库 | ✅ **已完成** | - |
| 用户等级 | ✅ User.userLevel | ✅ 数据库 | ✅ **已完成** | - |
| 成就记录 | ✅ Achievement | ✅ 数据库 | ✅ **已完成** | - |
| 心树名字 | ✅ User.heartTreeName | ✅ 数据库 | ✅ **已完成** | - |
| 心树等级 | ✅ User.heartTreeLevel | ✅ 数据库 | ✅ **已完成** | - |
| 心树经验 | ✅ User.heartTreeTotalExp | ✅ 数据库 | ✅ **已完成** | - |
| 浇水日期 | ✅ User.lastWateredDate | ✅ 数据库 | ✅ **已完成** | - |
| 施肥状态 | ✅ User.fertilizerExpiresAt | ✅ 数据库 | ✅ **已完成** | - |
| 专注记录 | ✅ FocusSession | ✅ 数据库 | ✅ **已完成** | - |
| 每日小结 | ✅ DailySummary | ✅ 数据库 | ✅ **已完成** | - |
| 周报数据 | ✅ WeeklyReport | ✅ 数据库 | ✅ **已完成** | - |
| **用户计划** | ✅ Project | ❌ **localStorage** | 🔴 **未迁移** | 🔴 **高** |
| **里程碑** | ✅ Milestone | ❌ **localStorage** | 🔴 **未迁移** | 🔴 **高** |
| **今日统计** | ⚠️ 可计算 | ❌ localStorage | 🟡 **需优化** | 🟡 **中** |
| **心流指标** | ❌ 无表 | ❌ localStorage | 🟡 **需添加** | 🟡 **中** |

---

## 🔍 详细分析

### ✅ 已迁移的数据（9项）

#### 1. **用户经验和等级** ✅
- **表：** `User.userExp`, `User.userLevel`
- **API：** `/api/user/exp`, `/api/user/exp/update`
- **Hook：** `useUserExp()`
- **状态：** 完全使用数据库 ✅

#### 2. **成就系统** ✅
- **表：** `Achievement`
- **API：** `/api/achievements`, `/api/achievements/unlock`
- **Hook：** `useAchievements()`
- **状态：** 完全使用数据库 ✅

#### 3. **心树数据** ✅
- **表：** `User.heartTreeName`, `User.heartTreeLevel`, `User.heartTreeTotalExp`, `User.lastWateredDate`, `User.fertilizerExpiresAt`, `User.fertilizerMultiplier`
- **API：** `/api/heart-tree/get-name`, `/api/heart-tree/update-name`, `/api/heart-tree/exp`
- **Hook：** `useHeartTreeName()`, `useHeartTreeExp()`
- **状态：** 完全使用数据库 ✅

#### 4. **专注记录** ✅
- **表：** `FocusSession`
- **API：** `/api/focus-sessions`
- **状态：** 完全使用数据库 ✅

#### 5. **每日小结** ✅
- **表：** `DailySummary`
- **API：** `/api/daily-summary/today`
- **状态：** 完全使用数据库 ✅

#### 6. **周报** ✅
- **表：** `WeeklyReport`
- **API：** `/api/weekly-report`
- **状态：** 完全使用数据库 ✅

---

### 🔴 未迁移的数据（2项，严重！）

#### 1. **用户计划 (userPlans)** 🔴

**当前问题：**
```typescript
// ❌ 代码仍在用 localStorage
const savedPlans = localStorage.getItem('userPlans');
const plans = savedPlans ? JSON.parse(savedPlans) : [];
```

**数据库已有表：**
```prisma
model Project {
  id               String @id
  name             String
  icon             String
  dailyGoalMinutes Int
  isActive         Boolean
  userId           String
  milestones       Milestone[]
}
```

**API 状态：**
- ✅ 有 `/api/projects` 
- ❌ **但只返回示例数据，未真正使用数据库！**

**影响：**
- 🔴 用户创建的所有计划存在 localStorage
- 🔴 清除缓存后计划全部丢失
- 🔴 无法跨设备同步

**紧急程度：** 🔴🔴🔴 **非常高！**

#### 2. **里程碑 (Milestones)** 🔴

**当前问题：**
```typescript
// ❌ 里程碑存储在 localStorage 的 userPlans 中
const plan = plans.find(p => p.id === planId);
const milestones = plan.milestones; // localStorage 中的数据
```

**数据库已有表：**
```prisma
model Milestone {
  id          String @id
  title       String
  isCompleted Boolean
  order       Int
  projectId   String
  project     Project @relation(...)
}
```

**影响：**
- 🔴 里程碑完成状态存在 localStorage
- 🔴 清除后用户进度丢失
- 🔴 无法跨设备同步

**紧急程度：** 🔴🔴🔴 **非常高！**

---

### 🟡 需要优化的数据（2项）

#### 3. **今日统计 (todayStats)** 🟡

**当前实现：**
```typescript
// localStorage.getItem('todayStats')
// 格式：{ "2024-12-19": { minutes: 60, date: "2024-12-19" } }
```

**优化方案：**
从数据库的 `FocusSession` 实时计算：
```typescript
const todayStats = await db.focusSession.aggregate({
  where: {
    userId: userId,
    startTime: {
      gte: new Date(today + 'T00:00:00'),
      lt: new Date(tomorrow + 'T00:00:00')
    }
  },
  _sum: { duration: true },
  _count: true
});
```

**优点：**
- ✅ 数据永不丢失
- ✅ 跨设备同步
- ✅ 实时准确

**缺点：**
- ⚠️ 每次需要查询数据库（可缓存）

#### 4. **心流指标 (flowMetrics)** 🟡

**当前实现：**
```typescript
// localStorage.getItem('flowMetrics')
// 包含：impression, tempFlow, totalFocusMinutes, sessionCount 等
```

**优化方案：**
添加到 User 表作为 JSON 字段：
```prisma
model User {
  // ... 现有字段
  flowMetrics Json? // 存储心流指标数据
}
```

---

## 🚨 严重问题：userPlans 未真正使用数据库

### 问题代码：

**`/api/projects/index.ts`（第22-35行）：**
```typescript
// 🔴 只返回示例数据！
const projects = [
  {
    id: '1',
    name: '示例项目',
    // ...
  }
];
return res.status(200).json({ projects });
```

### 实际使用情况：

**13处使用 `localStorage.getItem('userPlans')`：**
1. `dashboard/index.tsx` (2处)
2. `dashboard/index.mobile.tsx` (2处)
3. `focus/index.tsx` (3处)
4. `onboarding/goal-setting.tsx` (2处)
5. `plans/index.tsx` (1处)
6. `focus/index.tsx.backup` (3处)

**结论：** 
- 🔴 **用户计划系统完全依赖 localStorage**
- 🔴 **数据库的 Project 表形同虚设**
- 🔴 **这是数据丢失的最大风险点！**

---

## 🎯 立即行动方案

### 阶段1: 紧急修复（今天完成）

#### 1. 实现 Project CRUD API

需要创建以下 API：
- `POST /api/projects/create` - 创建计划
- `GET /api/projects` - 获取用户所有计划
- `PUT /api/projects/[id]` - 更新计划
- `DELETE /api/projects/[id]` - 删除计划
- `POST /api/projects/[id]/milestones` - 添加里程碑
- `PUT /api/projects/[id]/milestones/[milestoneId]` - 更新里程碑

#### 2. 创建 useProjects Hook

```typescript
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 从数据库加载
  const loadProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data.projects);
  };
  
  // 创建计划
  const createProject = async (project: Project) => {
    const res = await fetch('/api/projects/create', {
      method: 'POST',
      body: JSON.stringify(project)
    });
    await loadProjects(); // 刷新列表
  };
  
  return { projects, createProject, loadProjects };
}
```

#### 3. 数据迁移脚本

```typescript
// 将 localStorage 的 userPlans 迁移到数据库
async function migrateUserPlans(userId: string) {
  const localPlans = JSON.parse(localStorage.getItem('userPlans') || '[]');
  
  for (const plan of localPlans) {
    await fetch('/api/projects/create', {
      method: 'POST',
      body: JSON.stringify(plan)
    });
  }
  
  console.log('✅ 迁移完成:', localPlans.length, '个计划');
}
```

---

### 阶段2: 优化统计数据（本周完成）

#### 1. todayStats 从数据库计算

```typescript
// 不再使用 localStorage
// const todayStats = localStorage.getItem('todayStats');

// 改为从 FocusSession 计算
const todayStats = await db.focusSession.aggregate({
  where: {
    userId: userId,
    startTime: { gte: startOfToday, lt: startOfTomorrow }
  },
  _sum: { duration: true }
});
```

#### 2. flowMetrics 添加到数据库

**Schema 改动：**
```prisma
model User {
  // ... 现有字段
  flowMetrics Json? @default("{\"impression\":50,\"tempFlow\":0,\"totalFocusMinutes\":0}")
}
```

**迁移：**
```bash
npx prisma migrate dev --name add_flow_metrics
```

---

## 📋 完整迁移检查清单

### ✅ 已完成（9项）

- [x] 用户经验值 (User.userExp)
- [x] 用户等级 (User.userLevel)
- [x] 成就系统 (Achievement 表)
- [x] 心树名字 (User.heartTreeName)
- [x] 心树等级 (User.heartTreeLevel)
- [x] 心树经验 (User.heartTreeTotalExp)
- [x] 浇水日期 (User.lastWateredDate)
- [x] 施肥状态 (User.fertilizerExpiresAt)
- [x] 专注记录 (FocusSession 表)
- [x] 每日小结 (DailySummary 表)
- [x] 周报数据 (WeeklyReport 表)

### 🔴 紧急待办（2项）

- [ ] **用户计划 (Project 表)** - 表已有但未使用！
  - [ ] 实现 Project CRUD API
  - [ ] 创建 useProjects Hook
  - [ ] 替换所有 localStorage.getItem('userPlans')
  - [ ] 数据迁移脚本

- [ ] **里程碑 (Milestone 表)** - 表已有但未使用！
  - [ ] 实现 Milestone CRUD API
  - [ ] 与 Project API 集成
  - [ ] 替换 localStorage 中的里程碑逻辑

### 🟡 优化待办（2项）

- [ ] **今日统计 (todayStats)** - 从 FocusSession 计算
  - [ ] 创建统计计算函数
  - [ ] 缓存机制（避免频繁查询）
  - [ ] 替换 localStorage 使用

- [ ] **心流指标 (flowMetrics)** - 添加到数据库
  - [ ] 修改 schema 添加 flowMetrics JSON 字段
  - [ ] 创建迁移文件
  - [ ] 实现 API 读写
  - [ ] 迁移现有数据

---

## 🚨 最严重的问题

### **用户计划 (userPlans) 未使用数据库！**

**证据：**

1. **API 只返回假数据：**
```typescript
// src/pages/api/projects/index.ts (第22行)
const projects = [
  { id: '1', name: '示例项目', ... }  // 🔴 硬编码！
];
```

2. **代码中13处使用 localStorage：**
```typescript
const savedPlans = localStorage.getItem('userPlans'); // 🔴 危险！
```

3. **用户数据完全存在 localStorage：**
- 用户创建的所有计划
- 所有里程碑和完成状态
- 计划的设置和配置

**风险：**
- 🔴 **清除缓存 → 所有计划丢失**
- 🔴 **换设备 → 无法同步计划**
- 🔴 **数据无备份 → 永久丢失**

---

## ✅ 立即实施方案

### 我现在就开始创建完整的迁移系统：

1. ✅ 实现完整的 Project CRUD API
2. ✅ 实现 Milestone CRUD API
3. ✅ 创建 useProjects Hook
4. ✅ 数据迁移工具
5. ✅ 优化 todayStats 计算
6. ✅ 添加 flowMetrics 到数据库

---

准备好了吗？我现在就开始迁移！




