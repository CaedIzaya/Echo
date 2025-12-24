# localStorage 审计报告

## 📊 当前使用的所有 localStorage Key

### 🔴 关键数据（应该迁移到数据库）

| Key | 用途 | 数据类型 | 是否在数据库 | 迁移优先级 |
|-----|------|----------|-------------|-----------|
| `achievedAchievements` | 已解锁成就列表 | `string[]` | ✅ 有 | 🔴 **已完成** |
| `userExp` | 用户经验值 | `number` | ✅ 有 | 🔴 **已完成** |
| `userExpSynced` | 经验值同步标记 | `boolean` | ❌ 无 | 🟡 **中** |
| `todayStats` | 每日专注统计 | `object` | ⚠️ 部分 | 🔴 **高** |
| `totalFocusMinutes` | 累计专注时长 | `number` | ⚠️ 可计算 | 🔴 **高** |
| `weeklyStats` | 本周统计数据 | `object` | ⚠️ 可计算 | 🟡 **中** |
| `userPlans` | 用户计划列表 | `Project[]` | ✅ 有 | 🔴 **高** |
| `dashboardStats` | 面板统计数据 | `object` | ⚠️ 可计算 | 🟢 **低** |
| `flowMetrics` | 心流指标数据 | `object` | ❌ 无 | 🟡 **中** |

### 🟡 临时数据（可保留在 localStorage）

| Key | 用途 | 数据类型 | 说明 |
|-----|------|----------|------|
| `focusSession` | 当前专注会话 | `object` | 临时会话数据，结束后清除 |
| `focusSessionEnded` | 专注结束标记 | `boolean` | 临时标记 |
| `focusCompleted` | 专注完成标记 | `boolean` | 用于跳转后显示祝贺 |
| `focusTimerLastSaved` | 定时器保存时间 | `string` | 防止意外关闭丢失进度 |

### 🟢 UI 状态（保留在 localStorage）

| Key | 用途 | 数据类型 | 说明 |
|-----|------|----------|------|
| `lastWelcomeDate` | 上次欢迎日期 | `string` | 控制每日欢迎显示 |
| `lastLoginDate` | 上次登录日期 | `string` | 每日登录奖励判定 |
| `lastFocusDate` | 上次专注日期 | `string` | 连胜判定 |
| `lastSpiritInteractionDate` | 上次精灵互动日期 | `string` | 限制互动频率 |
| `idleEncourageShownDate` | 空闲鼓励显示日期 | `string` | 防止重复显示 |
| `minFocusFirstShownDate` | 最小专注首次显示 | `string` | 语境控制 |
| `afterFocusFirstShownDate` | 专注后首次显示 | `string` | 语境控制 |
| `streak7ShownDate` | 连胜7天显示 | `string` | 防止重复祝贺 |
| `unviewedAchievements` | 未查看成就 | `string[]` | 成就通知 |

### 🔵 "首次"标记（应该使用数据库或防护标记）

| Key | 用途 | 问题 | 建议 |
|-----|------|------|------|
| `firstFocusCompleted` | 首次完成专注 | ❌ 清除后重复触发 | ✅ 改用数据库 |
| `firstPlanCreated` | 首次创建计划 | ❌ 清除后重复触发 | ✅ 改用数据库 |
| `firstMilestoneCreated` | 首次创建里程碑 | ❌ 清除后重复触发 | ✅ 改用数据库 |
| `firstPlanCompleted` | 首次完成计划 | ❌ 清除后重复触发 | ✅ 改用数据库 |

### 🛡️ 防护标记（新增，防止误判）

| Key | 用途 | 状态 |
|-----|------|------|
| `protection_first_focus` | 首次专注防护 | ✅ **已实现** |
| `protection_first_achievement` | 首次成就防护 | ✅ **已实现** |
| `protection_exp_milestone` | 经验里程碑防护 | ✅ **已实现** |

### 📦 数据恢复相关

| Key | 用途 | 说明 |
|-----|------|------|
| `dataRecovered` | 数据已恢复标记 | 防止重复恢复 |
| `dataRecoveredAt` | 数据恢复时间 | 记录恢复时间 |

---

## ⚠️ 核心问题分析

### 问题 1: "首次"标记依赖 localStorage

**当前实现：**
```typescript
const firstFocusCompleted = localStorage.getItem('firstFocusCompleted') === 'true';
if (firstFocusCompleted) {
  // 触发首次专注成就
}
```

**问题：**
- ❌ localStorage 清除后重复触发"首次"成就
- ❌ 误判老用户为新用户
- ❌ 无法跨设备同步

**解决方案：**
使用数据库中的成就记录判断：
```typescript
// 改进后：从数据库判断
const hasFirstFocusAchievement = await checkAchievementExists('first_focus');
if (!hasFirstFocusAchievement && hasCompletedFocus) {
  // 触发首次专注成就（只会触发一次）
}
```

### 问题 2: 新用户判定仍部分依赖 localStorage

**当前实现：**
虽然我们添加了 `DataIntegritySystem`，但有些地方仍直接读取 localStorage：

```typescript
const firstFocusCompleted = localStorage.getItem('firstFocusCompleted') === 'true';
```

**问题：**
- 新用户判定逻辑分散
- 容易遗漏某些判定点

**解决方案：**
统一使用 `DataIntegritySystem.isReallyNewUser()`

### 问题 3: 成就存储结构

**数据库结构（Prisma）：**
```prisma
model Achievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String   // 成就ID，如 "first_focus"
  category      String
  unlockedAt    DateTime @default(now())
  
  @@unique([userId, achievementId])
}
```

**这个结构很好！** ✅
- 不是 boolean，而是存储成就记录
- `achievementId` 是字符串，可以存储任何成就
- `@@unique([userId, achievementId])` 防止重复解锁
- 有解锁时间记录

**但有一个隐患：**
成就系统加载时，从数据库获取后，**仍然存储在 localStorage**：
```typescript
// AchievementSystem.tsx
const achievementIds = data.map((a: any) => a.achievementId);
localStorage.setItem('achievedAchievements', JSON.stringify(achievementIds));
```

这样做是为了性能，但如果 localStorage 被清除，又回到原点。

---

## ✅ 优化方案

### 方案 A: 彻底移除关键数据的 localStorage 依赖

#### 1. 成就系统改为纯数据库模式

**改进前：**
```typescript
class AchievementManager {
  private achievedAchievements: Set<string> = new Set();
  
  constructor() {
    this.loadAchievedAchievements(); // 从 localStorage
  }
}
```

**改进后：**
```typescript
class AchievementManager {
  private achievedAchievements: Set<string> = new Set();
  private userId: string | null = null;
  
  async initialize(userId: string) {
    this.userId = userId;
    // 直接从数据库加载
    await this.loadFromDatabase();
  }
  
  private async loadFromDatabase() {
    const response = await fetch('/api/achievements');
    const data = await response.json();
    this.achievedAchievements = new Set(data.map(a => a.achievementId));
    
    // 可选：缓存到 localStorage（仅作为缓存，不作为真相源）
    if (typeof window !== 'undefined') {
      localStorage.setItem('achievedAchievements_cache', JSON.stringify([...this.achievedAchievements]));
    }
  }
}
```

#### 2. "首次"判定完全基于数据库

**改进后：**
```typescript
// 不再使用 localStorage 标记
// const firstFocusCompleted = localStorage.getItem('firstFocusCompleted') === 'true';

// 改为从成就管理器查询
const hasFirstFocusAchievement = achievementManager.hasAchievement('first_focus');
```

#### 3. 用户计划迁移到数据库

**当前：** `userPlans` 存储在 localStorage  
**问题：** 清除后计划丢失  
**方案：** 已有 `Project` 表，应该完全使用数据库

### 方案 B: 混合模式（推荐）

保持当前架构，但增强数据完整性：

#### 1. localStorage 作为缓存层

```
数据库（真相源） 
  ↓
  同步到 localStorage（缓存）
  ↓
  应用使用缓存数据
```

#### 2. 启动时强制同步

```typescript
useEffect(() => {
  if (session?.user?.id) {
    // 1. 从数据库加载权威数据
    await loadAllCriticalData();
    
    // 2. 覆盖 localStorage
    syncToLocalStorage();
    
    // 3. 后续使用 localStorage 提高性能
  }
}, [session?.user?.id]);
```

#### 3. 关键操作双写

```typescript
// 解锁成就时
async function unlockAchievement(achievementId: string) {
  // 1. 写入数据库（权威）
  await fetch('/api/achievements/unlock', {
    method: 'POST',
    body: JSON.stringify({ achievementId })
  });
  
  // 2. 更新 localStorage（缓存）
  const achievements = JSON.parse(localStorage.getItem('achievedAchievements') || '[]');
  achievements.push(achievementId);
  localStorage.setItem('achievedAchievements', JSON.stringify(achievements));
  
  // 3. 设置防护标记
  setProtectionMarker('first_achievement');
}
```

---

## 🎯 推荐实施方案

### 阶段 1: 立即修复（关键数据保护）

1. ✅ **已完成**: 数据完整性检查系统
2. ✅ **已完成**: 防护标记系统
3. ✅ **已完成**: 成就数据库同步

### 阶段 2: 短期优化（1-2周）

1. **移除"首次"标记的 localStorage 依赖**
   - ✅ 改为从数据库成就记录判断
   - ✅ 删除 `firstFocusCompleted` 等标记
   
2. **用户计划完全使用数据库**
   - ✅ 创建/更新计划时写入数据库
   - ✅ 加载时从数据库读取
   - ❌ 停止使用 `localStorage.getItem('userPlans')`

3. **专注统计数据库化**
   - ✅ `todayStats` 从 FocusSession 计算
   - ✅ `totalFocusMinutes` 从 FocusSession 聚合
   - ✅ `weeklyStats` 从 FocusSession 聚合

### 阶段 3: 长期优化（1-2月）

1. **实现 IndexedDB 作为本地数据库**
   - 比 localStorage 更可靠
   - 支持更复杂的查询
   - 不容易被清除

2. **离线模式支持**
   - Service Worker + IndexedDB
   - 离线时数据保存在 IndexedDB
   - 上线后自动同步

3. **实时同步机制**
   - WebSocket 实时推送
   - 跨设备数据同步
   - 冲突解决策略

---

## 📋 迁移清单

### 需要迁移到数据库的数据

- [ ] `userPlans` → 使用 `Project` 表（已有）
- [ ] `todayStats` → 从 `FocusSession` 计算
- [ ] `totalFocusMinutes` → 从 `FocusSession` 聚合
- [ ] `weeklyStats` → 从 `FocusSession` 计算
- [ ] `flowMetrics` → 创建新表或存储在 `User` 表

### 需要删除的 localStorage 标记

- [ ] `firstFocusCompleted` → 改用成就记录判断
- [ ] `firstPlanCreated` → 改用成就记录判断
- [ ] `firstMilestoneCreated` → 改用成就记录判断
- [ ] `firstPlanCompleted` → 改用成就记录判断

### 需要保留但增强的数据

- [x] `achievedAchievements` → 保留作为缓存，数据库为权威
- [x] `userExp` → 保留作为缓存，数据库为权威
- [x] 防护标记 → 已实现，作为备用验证

---

## 🚨 立即行动项

### 1. 创建数据库迁移 API

```typescript
// src/pages/api/user/sync-all-data.ts
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // 1. 从数据库加载所有数据
  const userData = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      achievements: true,
      focusSessions: true,
      projects: true,
    }
  });
  
  // 2. 计算统计数据
  const stats = calculateStats(userData);
  
  // 3. 返回完整数据
  return res.json({
    userExp: userData.userExp,
    userLevel: userData.userLevel,
    achievements: userData.achievements.map(a => a.achievementId),
    totalFocusMinutes: stats.totalMinutes,
    todayStats: stats.today,
    weeklyStats: stats.week,
    projects: userData.projects,
  });
}
```

### 2. 启动时调用同步 API

```typescript
// dashboard/index.tsx
useEffect(() => {
  if (session?.user?.id) {
    // 完整数据同步
    fetch('/api/user/sync-all-data')
      .then(res => res.json())
      .then(data => {
        // 更新所有 localStorage 缓存
        localStorage.setItem('userExp', data.userExp.toString());
        localStorage.setItem('achievedAchievements', JSON.stringify(data.achievements));
        // ... 其他数据
        
        console.log('✅ 数据同步完成');
      });
  }
}, [session?.user?.id]);
```

---

## 📊 总结

### 当前状态

| 方面 | 状态 | 说明 |
|-----|------|------|
| 成就存储结构 | ✅ 优秀 | 数据库结构正确，不是 boolean |
| 数据保护 | ✅ 良好 | 已有防护标记和恢复机制 |
| 新用户判定 | ⚠️ 改进中 | 部分逻辑仍依赖 localStorage |
| 数据同步 | ⚠️ 部分 | 成就和经验有同步，计划无 |

### 推荐优先级

1. 🔴 **立即**: 移除"首次"标记的 localStorage 依赖
2. 🟡 **本周**: 用户计划完全数据库化
3. 🟢 **本月**: 专注统计从数据库计算

### 长期目标

- 🎯 localStorage 仅作为缓存
- 🎯 数据库为唯一真相源
- 🎯 启动时完整同步
- 🎯 关键操作双写（数据库+缓存）












