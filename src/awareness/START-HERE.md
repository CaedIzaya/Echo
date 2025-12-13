# 🚀 深度觉察引擎 - 快速开始

## ✅ 文件已就绪

所有文件已创建在 `src/awareness/` 目录下，共 **20 个文件**。

## 🎯 核心功能

1. **优先级机制**：`PriorityLevel.AWARENESS = 1000`（最高优先级）
2. **6 大场景检测**：自动检测用户负面情绪和脆弱状态
3. **覆盖机制**：觉察文案会凌驾于所有其他文案系统之上
4. **冷却机制**：防止频繁触发

## 📝 快速集成（3 步）

### 步骤 1：在文案获取 API 中添加优先级检查

找到你现有的 Lumi 或心树文案获取 API（例如 `src/pages/api/dialogue/lumi.ts`），添加以下代码：

```typescript
import { buildAwarenessContext, getDialogueWithPriority, PriorityLevel } from '@/awareness';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未登录' });
  }

  const userId = session.user.id;

  // ✅ 1. 构建觉察上下文（替换为你的实际数据获取函数）
  const ctx = await buildAwarenessContext(
    userId,
    () => getUserDataFromDB(userId),
    () => getTodayStatsFromDB(userId),
    (days) => getLastNDaysStatsFromDB(userId, days),
    (minutes) => getRecentEventsFromDB(userId, minutes)
  );

  // ✅ 2. 优先检查觉察引擎
  const awarenessDialogue = getDialogueWithPriority(ctx);
  
  if (awarenessDialogue && awarenessDialogue.priority === PriorityLevel.AWARENESS) {
    // ✅ 觉察引擎匹配，返回觉察文案，阻止其他系统
    return res.status(200).json({
      copy: awarenessDialogue.copy,
      source: awarenessDialogue.source,
      isAwareness: true,
    });
  }

  // ✅ 3. 觉察引擎未匹配，使用普通文案系统
  const normalDialogue = await getNormalLumiDialogue();
  return res.status(200).json({
    copy: normalDialogue,
    source: 'LUMI',
    isAwareness: false,
  });
}
```

### 步骤 2：实现数据获取函数

根据你的数据库结构，实现以下函数：

```typescript
// src/lib/awareness-data.ts
import { prisma } from '@/lib/prisma'; // 或你的数据库客户端

export async function getUserDataFromDB(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      currentStreak: true,
      streakStableDays: true,
      lastActiveDate: true,
      timezone: true,
      hasNamedHeartTree: true,
      heartTreeName: true,
    },
  });
}

export async function getTodayStatsFromDB(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  return await prisma.dayStats.findFirst({
    where: { userId, date: today },
  }) || {
    date: today,
    appForegroundMinutes: 0,
    homeStayMinutes: 0,
    focusTotalMinutes: 0,
    focusSessionCount: 0,
    focusShortSessionCount: 0,
    focusTimerOpenCountNoStart: 0,
    lumiClickCount: 0,
  };
}

export async function getLastNDaysStatsFromDB(userId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return await prisma.dayStats.findMany({
    where: {
      userId,
      date: { gte: startDate.toISOString().split('T')[0] },
    },
    orderBy: { date: 'desc' },
    take: days,
  });
}

export async function getRecentEventsFromDB(userId: string, minutes: number) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return await prisma.event.findMany({
    where: {
      userId,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'desc' },
  });
}
```

### 步骤 3：在关键事件处触发觉察检测

在以下事件发生时调用觉察检测：

- **App 启动时**：`onAppLaunch(userId, providers)`
- **专注结束时**：`onFocusTimerEnd(userId, durationMinutes, providers)`
- **Lumi 点击时**：`onLumiClick(userId, providers)`
- **App 前台更新时**：`onAppForegroundUpdate(userId, foregroundMinutes, homeStayMinutes, providers)`
- **打开心树时**：`onHeartTreeOpen(userId, providers)`

参考 `event-integration.ts` 中的示例代码。

## 📚 详细文档

- **README.md** - 完整功能文档
- **INTEGRATION-STEPS.md** - 详细集成步骤
- **INTEGRATION-CHECK.md** - 集成检查清单
- **quick-integration.ts** - 快速集成模板代码

## ⚠️ 重要提示

1. **优先级检查必须在所有文案获取之前**
2. **如果觉察引擎匹配，必须阻止其他文案系统**
3. **数据必须实时更新，否则可能错过触发时机**
4. **确保数据库字段名匹配，或使用 `database-adapter.ts` 中的适配函数**

## 🧪 测试验证

1. 修改数据库中的用户数据，模拟场景 2（长时间未上线）
2. 启动 App
3. 检查是否显示觉察文案（而不是普通文案）

## ❓ 需要帮助？

查看以下文件：
- `INTEGRATION-STEPS.md` - 详细集成步骤
- `api-integration.ts` - API 集成示例
- `event-integration.ts` - 事件集成示例
- `quick-integration.ts` - 快速集成模板




