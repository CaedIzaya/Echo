# 深度觉察引擎 - t3-app 集成步骤

## 🎯 目标

确保觉察引擎能在你的 t3-app 系统中正确触发，优先级最高，凌驾于所有其他文案系统之上。

## 📋 集成检查清单

### ✅ 步骤 1：确认文件已创建

确认以下文件存在于 `src/awareness/` 目录：
- [x] `index.ts` - 主入口
- [x] `types.ts` - 类型定义
- [x] `priority-manager.ts` - 优先级管理器
- [x] `database-adapter.ts` -adapter.ts` - 数据库适配器
- [x] `rules.ts` - 6 大场景规则
- [x] `copy-pool.ts` - 文案池

### ✅ 步骤 2：创建 API 路由

在 `src/pages/api/awareness/dialogue.ts` 中创建 API：

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { buildAwarenessContext, getDialogueWithPriority, PriorityLevel } from '@/awareness';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const userId = session.user.id;

    // TODO: 替换为你的实际数据获取函数
    const ctx = await buildAwarenessContext(
      userId,
      () => getUserDataFromDB(userId),
      () => getTodayStatsFromDB(userId),
      (days) => getLastNDaysStatsFromDB(userId, days),
      (minutes) => getRecentEventsFromDB(userId, minutes)
    );

    const awarenessDialogue = getDialogueWithPriority(ctx);

    if (awarenessDialogue && awarenessDialogue.priority === PriorityLevel.AWARENESS) {
      return res.status(200).json({
        hasAwareness: true,
        dialogue: awarenessDialogue,
      });
    }

    return res.status(200).json({
      hasAwareness: false,
      dialogue: null,
    });
  } catch (error) {
    console.error('觉察引擎 API 错误:', error);
    return res.status(500).json({ error: '内部服务器错误' });
  }
}
```

### ✅ 步骤 3：在现有文案 API 中集成

修改你现有的 Lumi 或心树文案获取 API，在返回文案之前先检查觉察引擎：

```typescript
// src/pages/api/dialogue/lumi.ts (示例)
import { buildAwarenessContext, getDialogueWithPriority, PriorityLevel } from '@/awareness';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ error: '未登录' });
  }

  // 1. 优先检查觉察引擎
  const ctx = await buildAwarenessContext(...);
  const awarenessDialogue = getDialogueWithPriority(ctx);
  
  if (awarenessDialogue && awarenessDialogue.priority === PriorityLevel.AWARENESS) {
    // 觉察引擎匹配，返回觉察文案，阻止其他系统
    return res.status(200).json({
      copy: awarenessDialogue.copy,
      source: awarenessDialogue.source,
      isAwareness: true,
    });
  }

  // 2. 觉察引擎未匹配，使用普通文案系统
  const normalDialogue = await getNormalLumiDialogue();
  return res.status(200).json({
    copy: normalDialogue,
    source: 'LUMI',
    isAwareness: false,
  });
}
```

### ✅ 步骤 4：在关键事件处触发觉察检测

#### 4.1 App 启动时（`_app.tsx` 或 `layout.tsx`）

```typescript
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { onAppLaunch } from '@/awareness/event-integration';

export default function App({ Component, pageProps }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      onAppLaunch(session.user.id, {
        getUserData: () => fetch('/api/user/stats').then(r => r.json()),
        getTodayStats: () => fetch('/api/stats/today').then(r => r.json()),
        getLastNDaysStats: (days) => fetch(`/api/stats/last-days?days=${days}`).then(r => r.json()),
        getRecentEvents: (minutes) => fetch(`/api/events/recent?minutes=${minutes}`).then(r => r.json()),
      });
    }
  }, [session]);

  return <Component {...pageProps} />;
}
```

#### 4.2 专注计时器结束时

```typescript
import { onFocusTimerEnd } from '@/awareness/event-integration';

async function handleFocusEnd(durationMinutes: number) {
  // 更新统计数据
  await updateFocusStats(durationMinutes);

  // 触发觉察检测
  await onFocusTimerEnd(userId, durationMinutes, providers);
}
```

#### 4.3 Lumi 被点击时

```typescript
import { onLumiClick } from '@/awareness/event-integration';

function handleLumiClick() {
  // 更新点击计数
  incrementLumiClickCount();

  // 触发觉察检测
  onLumiClick(userId, providers);
}
```

### ✅ 步骤 5：实现数据层接口

你需要实现以下数据获取函数（根据你的数据库结构）：

```typescript
// src/lib/awareness-data.ts
import { prisma } from '@/lib/prisma'; // 或你的数据库客户端

export async function getUserDataForAwareness(userId: string) {
  const user = await prisma.user.findUnique({
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

  return user;
}

export async function getTodayStatsForAwareness(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  const stats = await prisma.dayStats.findFirst({
    where: {
      userId,
      date: today,
    },
  });

  return stats || {
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

export async function getLastNDaysStatsForAwareness(userId: string, days: number) {
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

export async function getRecentEventsForAwareness(userId: string, minutes: number) {
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

### ✅ 步骤 6：在组件中使用

```typescript
// 在 Lumi 组件中
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export function LumiComponent() {
  const { data: session } = useSession();
  const [dialogue, setDialogue] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDialogue() {
      if (!session?.user?.id) return;

      // 优先检查觉察引擎
      const awarenessRes = await fetch('/api/awareness/dialogue');
      const awareness = await awarenessRes.json();

      if (awareness.hasAwareness) {
        setDialogue(awareness.dialogue.copy);
        return;
      }

      // 觉察引擎未匹配，使用普通文案
      const normalRes = await fetch('/api/dialogue/lumi');
      const normal = await normalRes.json();
      setDialogue(normal.copy);
    }

    fetchDialogue();
  }, [session]);

  return <div>{dialogue}</div>;
}
```

## 🔍 验证触发

### 测试场景 1：长时间未上线

1. 修改数据库中的 `lastActiveDate` 为 4 天前
2. 设置 `currentStreak = 1`，`streakStableDays = 3`
3. 启动 App
4. **预期**：Lumi 显示场景 2 的文案

### 测试场景 2：挂机不专注

1. 设置 `appForegroundMinutes = 25`，`homeStayMinutes = 20`
2. 设置 `focusTotalMinutes = 0`
3. 设置 `focusTimerOpenCountNoStart = 3`
4. 触发前台更新事件
5. **预期**：心树显示场景 1 的浮窗

### 测试场景 3：优先级覆盖

1. 同时满足场景 2（长时间未上线）和普通 Lumi 文案应该触发
2. **预期**：只显示觉察文案，不显示普通文案

## ⚠️ 重要提示

1. **优先级检查必须在所有文案获取之前**
2. **如果觉察引擎匹配，必须阻止其他文案系统**
3. **数据必须实时更新，否则可能错过触发时机**
4. **确保数据库字段名匹配，或使用适配器函数**

## 📝 下一步

1. 根据你的数据库结构实现数据获取函数
2. 在现有文案 API 中集成优先级检查
3. 在关键事件处调用觉察检测
4. 测试各个场景的触发





