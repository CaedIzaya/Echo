# 深度觉察引擎

## 概述

深度觉察引擎是一个高优先级模块，用于检测用户的负面情绪和脆弱状态，并通过 **Lumi** 和 **心树** 做出恰当的回应。该机制会凌驾于所有普通交互对话文案池之上。

## 核心特性

- 🔍 **6 大场景检测**：覆盖挂机不专注、长时间未上线、目标失败循环、多次短专注、深夜上线、过度点击 Lumi 等场景
- 🎯 **优先级机制**：按危险等级和优先级自动选择最合适的响应
- ⏱️ **冷却机制**：防止同一规则频繁触发，避免过度打扰
- 💬 **智能文案池**：每个场景都有专门的文案池，符合情绪和语气要求
- 🌳 **心树命名流程**：新用户首次进入心树时的命名引导

## 目录结构

```
src/awareness/
├── index.ts              # 主入口，导出所有公共 API
├── types.ts              # 类型定义
├── engine.ts             # 核心引擎
├── rules.ts              # 6 大场景规则定义
├── dispatcher.ts         # 事件调度器
├── store.ts              # 存储管理（冷却机制）
├── copy-pool.ts          # 文案池
├── utils.ts              # 工具函数
├── priority-manager.ts   # 优先级管理器
├── database-adapter.ts   # 数据库适配器
├── integration-guide.ts  # 集成指南
├── heart-tree-naming.ts  # 心树命名流程
├── integration-example.ts # 集成示例
├── README.md             # 本文档
├── INTEGRATION-CHECK.md  # 集成检查清单
└── INTEGRATION.md        # 集成总结
```

## 快速开始

### 1. 基本使用

```typescript
import { getDialogueWithPriority, buildAwarenessContext } from '@/awareness';

// 在所有文案获取之前调用
const ctx = await buildAwarenessContext(userId, getUserData, getTodayStats, getLastNDaysStats, getRecentEvents);
const awarenessDialogue = getDialogueWithPriority(ctx);

if (awarenessDialogue) {
  // 觉察引擎匹配，使用觉察文案，阻止其他系统
  return awarenessDialogue.copy;
}

// 否则使用普通文案系统
return normalDialoguePool.getRandom();
```

### 2. 优先级机制（凌驾于一切）

```typescript
import { getDialogueWithPriority, PriorityLevel } from '@/awareness';

const dialogue = getDialogueWithPriority(ctx);
if (dialogue && dialogue.priority === PriorityLevel.AWARENESS) {
  // 觉察引擎匹配，优先级最高，阻止其他文案系统
  return dialogue.copy;
}
```

## 6 大场景说明

### 🜂 场景 1：一天内挂机太久，却迟迟无法进入专注

- **触发条件**：前台停留 > 20 分钟，且大部分时间在主页，专注时长 < 5 分钟，或多次打开计时器但未开始
- **响应者**：心树
- **呈现方式**：顶部轻浮窗（缓慢滑出，3 秒渐隐）
- **文案示例**：「你今天在门口走了好几圈。」

### 🜁 场景 2：连续几天未上线（Streak 固定为 1）

- **触发条件**：距离上次活跃 > 3 天，且 streak = 1 持续 ≥ 3 天
- **响应者**：Lumi
- **呈现方式**：上线瞬间 Lumi 主动说一句
- **文案示例**：「你回来了，隔了几天，我一直在。」

### 🜂 场景 3：连续几天未完成最小专注目标

- **触发条件**：最近 5 天中，有 ≥ 3 天专注时长 < 目标的 30%
- **响应者**：心树
- **呈现方式**：底栏心树图标发亮，进入时心树说话
- **文案示例**：「连最小目标有时候也很重，我懂。」

### 🜃 场景 4：多次尝试专注，却每次都失败

- **触发条件**：30 分钟内启动 2~4 次专注，每次 < 3 分钟中断
- **响应者**：Lumi
- **呈现方式**：Lumi 说话
- **文案示例**：「你刚才试了好几次，我看见了。」

### 🜄 场景 5：深夜上线（23:00–4:00）

- **触发条件**：本地时间在 23:00–4:00 之间，且最近有 APP_LAUNCH 事件
- **响应者**：Lumi
- **呈现方式**：Lumi 说话
- **文案示例**：「这个时间你还醒着啊。」

### 🜅 场景 6：点击 Lumi 太多次（不安 / 寻求陪伴）

- **触发条件**：10 分钟内点击 Lumi ≥ 4 次
- **响应者**：Lumi
- **呈现方式**：Lumi 说话
- **文案示例**：「你今天有点不安，对吗？」

## 优先级机制（凌驾于一切）

### 核心原理

1. **优先级定义**：
   - `PriorityLevel.AWARENESS = 1000`（觉察引擎，最高优先级）
   - `PriorityLevel.NORMAL = 0`（普通文案系统）

2. **统一入口**：
   ```typescript
   const dialogue = getDialogueWithPriority(ctx);
   if (dialogue) {
     // 觉察引擎匹配，使用觉察文案，阻止其他系统
     return dialogue.copy;
   }
   ```

3. **不会抢触发**：
   - 如果觉察引擎匹配 → 返回觉察文案，**不调用其他系统**
   - 如果觉察引擎未匹配 → 返回 null，**继续使用其他系统**

## 心树命名流程

新用户首次进入心树时，需要完成命名流程：

```typescript
import { shouldShowNamingFlow, completeNaming, getNamingGuideText } from '@/awareness/heart-tree-naming';

if (shouldShowNamingFlow(userState)) {
  // 1. 显示命名引导
  showNamingGuide(getNamingGuideText());
  
  // 2. 用户输入名字后
  const updatedUserState = completeNaming(userState, inputName);
  
  // 3. 显示心树名字（在页面顶部）
  displayHeartTreeName(updatedUserState.heartTreeName);
  
  // 4. 显示首次见面文案（顺序很重要！）
  showFirstMeetingText(getFirstMeetingText(updatedUserState.heartTreeName));
}
```

**重要**：顺序必须是：命名 → 显示名字 → 首次见面文案

## 数据要求

### DayStats（日级统计）

需要在数据层实时维护以下统计：

- `appForegroundMinutes`：当日前台总时长
- `homeStayMinutes`：停在主页的时长
- `focusTotalMinutes`：当日专注总时长
- `focusGoalMinutes`：当天最小目标
- `focusSessionCount`：专注会话总数
- `focusShortSessionCount`：短会话数（< 3 分钟）
- `focusTimerOpenCountNoStart`：打开计时器但未开始的次数
- `lumiClickCount`：Lumi 点击次数

### UserState（用户状态）

- `currentStreak`：当前连续天数
- `streakStableDays`：streak=1 持续天数
- `lastActiveDate`：上次活跃日期（yyyy-MM-dd）
- `timezone`：用户时区
- `hasNamedHeartTree`：是否已命名心树
- `heartTreeName`：心树名字

### RecentEvents（最近事件）

需要维护最近 30~60 分钟内的关键事件，包括：
- `APP_LAUNCH`
- `FOCUS_TIMER_START` / `FOCUS_TIMER_END` / `FOCUS_TIMER_CANCEL`
- `LUMI_CLICK`
- 等

## 优先级和冷却机制

### 优先级规则

1. 按 `riskLevel` 排序（3 > 2 > 1）
2. 相同 `riskLevel` 时，按 `priority` 排序

### 冷却机制

每个规则触发后，会进入冷却期，防止频繁触发：

- 场景 1：60 分钟
- 场景 2：720 分钟（12 小时）
- 场景 3：720 分钟（12 小时）
- 场景 4：60 分钟
- 场景 5：180 分钟（3 小时）
- 场景 6：30 分钟

## 扩展和自定义

### 添加新场景

1. 在 `rules.ts` 中定义新规则
2. 在 `copy-pool.ts` 中添加对应文案池
3. 更新 `store.ts` 中的优先级配置

### 自定义文案

修改 `copy-pool.ts` 中的 `COPY_POOL` 对象，添加或修改文案。

### 自定义冷却时间

在规则定义中修改 `cooldownMinutes` 字段。

## 注意事项

1. **数据实时性**：确保 `DayStats` 和 `recentEvents` 数据实时更新
2. **时区处理**：确保 `nowLocalHour` 使用用户本地时区
3. **UI 集成**：根据 `triggerMode` 和 `responder` 正确渲染 UI
4. **优先级集成**：在所有文案获取函数之前调用 `getDialogueWithPriority()`

## 许可证

内部使用















