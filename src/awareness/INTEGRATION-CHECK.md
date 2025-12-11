# 深度觉察引擎 - 集成检查清单

## ✅ 优先级机制检查

### 问题：如何实现"凌驾于一切"的触发机制？

**答案：** 使用优先级管理器（`priority-manager.ts`）

1. **优先级定义**：
   - `PriorityLevel.AWARENESS = 1000`（觉察引擎）
   - `PriorityLevel.NORMAL = 0`（普通文案系统）

2. **统一入口函数**：
   ```typescript
   import { getDialogueWithPriority } from '@/awareness';
   
   // 在所有文案获取之前调用
   const awarenessDialogue = getDialogueWithPriority(ctx);
   if (awarenessDialogue) {
     // 觉察引擎匹配，使用觉察文案，阻止其他系统
     return awarenessDialogue.copy;
   }
   // 否则继续使用普通文案系统
   ```

3. **阻止机制**：
   ```typescript
   import { shouldBlockOtherDialogues } from '@/awareness';
   
   if (shouldBlockOtherDialogues(ctx)) {
     // 不触发其他文案系统
     return;
   }
   ```

### 问题：是否会跟别的文案抢触发？

**答案：** 不会，因为：

1. **优先级检查在前**：所有文案获取函数都应该先调用 `getDialogueWithPriority()`
2. **如果觉察引擎匹配，直接返回，不调用其他系统**
3. **如果觉察引擎未匹配，返回 null，继续使用其他系统**

### 问题：是否只有觉察机制的文案会触发？

**答案：** 不是，逻辑是：

1. **优先检查觉察引擎**
   - 如果匹配 → 返回觉察文案，阻止其他系统
   - 如果未匹配 → 继续下一步

2. **使用普通文案系统**
   - 只有当觉察引擎未匹配时，才会使用普通文案

## ✅ 数据库兼容性检查

### 需要确认的数据库字段

#### 用户表（User）
```sql
-- 必需字段
id: string
currentStreak: number (默认 1)
streakStableDays: number (默认 0)
lastActiveDate: date/string (格式: yyyy-MM-dd)
timezone: string (默认 'Asia/Shanghai')
hasNamedHeartTree: boolean (默认 false)
heartTreeName: string? (可选)
```

#### 日统计表（DayStats）
```sql
-- 必需字段
date: date/string (格式: yyyy-MM-dd)
appForegroundMinutes: number (默认 0)
homeStayMinutes: number (默认 0)
focusTotalMinutes: number (默认 0)
focusGoalMinutes: number? (可选)
focusSessionCount: number (默认 0)
focusShortSessionCount: number (默认 0)
focusTimerOpenCountNoStart: number (默认 0)
lumiClickCount: number (默认 0)
```

#### 事件表（Event）
```sql
-- 必需字段
userId: string
type: string (APP_LAUNCH, FOCUS_TIMER_END, LUMI_CLICK 等)
timestamp: date/number
metadata: json? (可选，存储 durationMinutes 等)
```

### 数据库适配

如果字段名不同，使用 `database-adapter.ts` 中的适配函数：

```typescript
import { adaptUserState, adaptDayStats, adaptEvent } from '@/awareness';

// 适配用户数据
const userState = adaptUserState(dbUser, userId);

// 适配日统计
const dayStats = adaptDayStats(dbDayStats);

// 适配事件
const event = adaptEvent(dbEvent);
```

## ✅ 触发逻辑检查

### 触发时机

1. **APP_LAUNCH** - App 启动/回到前台
   - 检查场景 2（长时间未上线）
   - 检查场景 5（深夜上线）

2. **FOCUS_TIMER_END** - 专注结束
   - 检查场景 4（多次短专注）

3. **LUMI_CLICK** - 点击 Lumi
   - 检查场景 6（点击太多次）

4. **APP_FOREGROUND_START** - App 进入前台
   - 检查场景 1（挂机不专注）

5. **HEART_TREE_OPEN** - 打开心树
   - 检查场景 3（连续未完成目标）
   - 检查心树命名流程

### 触发条件验证

每个场景的触发条件已在 `rules.ts` 中定义，确保：

1. ✅ 数据实时更新（否则可能错过触发时机）
2. ✅ 冷却机制正常工作（防止频繁触发）
3. ✅ 优先级排序正确（riskLevel 3 > 2 > 1）

## ✅ 集成步骤

### 步骤 1：在现有文案系统前添加优先级检查

```typescript
// 原来的代码
function getLumiDialogue() {
  return normalDialoguePool.getRandom();
}

// 修改后
import { getDialogueWithPriority, buildAwarenessContext } from '@/awareness';

async function getLumiDialogue() {
  // 1. 构建觉察上下文
  const ctx = await buildAwarenessContext(
    userId,
    getUserData,
    getTodayStats,
    getLastNDaysStats,
    getRecentEvents
  );

  // 2. 优先检查觉察引擎
  const awarenessDialogue = getDialogueWithPriority(ctx);
  if (awarenessDialogue) {
    return awarenessDialogue.copy; // 返回觉察文案
  }

  // 3. 觉察引擎未匹配，使用普通文案
  return normalDialoguePool.getRandom();
}
```

### 步骤 2：在关键事件处调用觉察检测

```typescript
import { triggerAwareness, buildAwarenessContext } from '@/awareness';

// App 启动时
async function onAppLaunch() {
  const ctx = await buildAwarenessContext(...);
  triggerAwareness(ctx);
}

// 专注结束时
async function onFocusTimerEnd(durationMinutes: number) {
  // 更新统计数据
  updateStats(durationMinutes);
  
  // 触发觉察检测
  const ctx = await buildAwarenessContext(...);
  triggerAwareness(ctx);
}
```

### 步骤 3：实现 UI 组件

根据 `triggerMode` 和 `responder` 渲染不同的 UI：

- `LAUNCH` + `LUMI` → Lumi 气泡（上线瞬间）
- `PASSIVE` + `LUMI` → Lumi 轻提示（不打断操作）
- `HEART_TREE_FLOATING` + `HEART_TREE` → 心树浮窗（顶部滑出）

## ✅ 测试检查

### 测试场景 1：优先级覆盖

1. 模拟场景 2（长时间未上线）触发
2. 同时模拟普通 Lumi 文案应该触发
3. **预期结果**：只显示觉察文案，不显示普通文案

### 测试场景 2：正常情况

1. 模拟正常使用（无负面状态）
2. 普通 Lumi 文案应该触发
3. **预期结果**：显示普通文案，觉察引擎返回 null

### 测试场景 3：冷却机制

1. 触发场景 1
2. 立即再次触发相同条件
3. **预期结果**：第一次触发，第二次不触发（冷却中）

## ✅ 常见问题

### Q: 如果数据库字段名不同怎么办？

A: 使用 `database-adapter.ts` 中的适配函数，或修改适配函数以匹配你的数据库结构。

### Q: 如何禁用觉察引擎？

A: 
```typescript
import { setAwarenessEnabled } from '@/awareness';
setAwarenessEnabled(false);
```

### Q: 如何调试触发问题？

A: 
```typescript
import { runAwarenessEngine } from '@/awareness';
const match = runAwarenessEngine(ctx);
console.log('匹配结果:', match);
```

### Q: 如何查看冷却状态？

A:
```typescript
import { getCooldownStatus } from '@/awareness';
const status = getCooldownStatus(userId);
console.log('冷却状态:', status);
```

## ✅ 总结

1. **优先级机制**：✅ 已实现，使用 `PriorityLevel.AWARENESS = 1000`
2. **覆盖机制**：✅ 已实现，使用 `getDialogueWithPriority()` 优先检查
3. **阻止机制**：✅ 已实现，使用 `shouldBlockOtherDialogues()` 阻止其他系统
4. **数据库兼容**：✅ 已实现适配器，支持不同数据库结构
5. **触发逻辑**：✅ 已实现，6 大场景规则完整

**关键点**：在所有文案获取函数之前调用 `getDialogueWithPriority()`，如果返回非 null，使用觉察文案并阻止其他系统。

