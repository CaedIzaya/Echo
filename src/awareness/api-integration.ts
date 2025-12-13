/**
 * 深度觉察引擎 - API 集成示例
 * 展示如何在 API 路由中集成觉察引擎
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { buildAwarenessContext, getDialogueWithPriority, PriorityLevel } from './index';

/**
 * API 路由：获取觉察文案
 * 在所有文案获取 API 中，优先检查觉察引擎
 */
export async function getAwarenessDialogueAPI(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession({ req });
    if (!session?.user?.id) {
      return res.status(401).json({ error: '未登录' });
    }

    // 从数据库获取数据（这里需要替换为你的实际数据获取逻辑）
    const userId = session.user.id;
    
    // TODO: 替换为你的实际数据获取函数
    const getUserData = async () => {
      // 从数据库获取用户数据
      // return await db.user.findUnique({ where: { id: userId } });
      return {} as any;
    };

    const getTodayStats = async () => {
      // 从数据库获取今日统计
      // return await db.dayStats.findToday(userId);
      return {} as any;
    };

    const getLastNDaysStats = async (days: number) => {
      // 从数据库获取最近 N 天统计
      // return await db.dayStats.findLastNDays(userId, days);
      return [] as any[];
    };

    const getRecentEvents = async (minutes: number) => {
      // 从数据库获取最近事件
      // return await db.events.findRecent(userId, minutes);
      return [] as any[];
    };

    // 构建觉察上下文
    const ctx = await buildAwarenessContext(
      userId,
      getUserData,
      getTodayStats,
      getLastNDaysStats,
      getRecentEvents
    );

    // 检查觉察引擎
    const awarenessDialogue = getDialogueWithPriority(ctx);

    if (awarenessDialogue && awarenessDialogue.priority >= PriorityLevel.AWARENESS_LOW) {
      // 觉察引擎匹配，返回觉察文案
      return res.status(200).json({
        hasAwareness: true,
        dialogue: awarenessDialogue,
      });
    }

    // 觉察引擎未匹配，返回 null，由其他系统处理
    return res.status(200).json({
      hasAwareness: false,
      dialogue: null,
    });
  } catch (error) {
    console.error('觉察引擎 API 错误:', error);
    return res.status(500).json({ error: '内部服务器错误' });
  }
}

/**
 * 在现有文案获取 API 中集成觉察引擎
 * 
 * 示例：原来的 getLumiDialogue API
 */
export async function getLumiDialogueWithAwareness(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getSession({ req });
    if (!session?.user?.id) {
      return res.status(401).json({ error: '未登录' });
    }

    // 1. 构建觉察上下文
    const ctx = await buildAwarenessContext(
      session.user.id,
      () => getUserData(session.user.id),
      () => getTodayStats(session.user.id),
      (days: number) => getLastNDaysStats(session.user.id, days),
      (minutes: number) => getRecentEvents(session.user.id, minutes)
    );

    // 2. 优先检查觉察引擎
    const awarenessDialogue = getDialogueWithPriority(ctx);
    if (awarenessDialogue) {
      // 觉察引擎匹配，返回觉察文案
      return res.status(200).json({
        copy: awarenessDialogue.copy,
        source: awarenessDialogue.source,
        isAwareness: true,
        metadata: awarenessDialogue.metadata,
      });
    }

    // 3. 觉察引擎未匹配，使用普通文案系统
    const normalDialogue = await getNormalLumiDialogue(session.user.id);
    return res.status(200).json({
      copy: normalDialogue,
      source: 'LUMI',
      isAwareness: false,
    });
  } catch (error) {
    console.error('获取 Lumi 文案失败:', error);
    return res.status(500).json({ error: '内部服务器错误' });
  }
}

// 占位函数，需要替换为你的实际实现
async function getUserData(userId: string) {
  // TODO: 从数据库获取用户数据
  return {} as any;
}

async function getTodayStats(userId: string) {
  // TODO: 从数据库获取今日统计
  return {} as any;
}

async function getLastNDaysStats(userId: string, days: number) {
  // TODO: 从数据库获取最近 N 天统计
  return [] as any[];
}

async function getRecentEvents(userId: string, minutes: number) {
  // TODO: 从数据库获取最近事件
  return [] as any[];
}

async function getNormalLumiDialogue(userId: string) {
  // TODO: 从普通文案池获取文案
  return '普通文案';
}

