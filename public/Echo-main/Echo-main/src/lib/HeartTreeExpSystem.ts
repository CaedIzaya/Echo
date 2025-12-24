// 心树等级 & 经验系统（Level / EXP）
// ---------------------------------------------
// 设计目标（V1）：
// - 简单、好调参数：线性经验曲线，方便以后整体重算
// - 让用户"常常升级"，但不会升级到麻木
// - 成长完全围绕「专注行为 + 反思行为」，心树是这些行为的年轮可视化

export interface HeartTreeExpState {
  /** 当前等级（1~MAX_LEVEL） */
  level: number;
  /** 当前等级内已累积的 EXP（距离下一级的进度） */
  currentExp: number;
  /** 累计总 EXP（主要用于展示） */
  totalExp: number;

  /** 施肥 Buff：在有效期内对所有 EXP 收益生效 */
  fertilizerBuff?: {
    /** 过期时间（ISO 字符串） */
    expiresAt: string;
    /** 倍率，例如 1.3 = +30% EXP */
    multiplier: number;
  };

  /** 最近一次浇水的日期（YYYY-MM-DD） */
  lastWateredDate?: string;
}

// ------- 常量配置（可日后整体重算时统一调整） -------

/** 最大等级（V1：Lv1 ~ Lv10 即可） */
export const HEART_TREE_MAX_LEVEL = 10;

/** 线性经验曲线：每升一级所需 EXP = 40 + (level - 1) * 20 */
export function expToNextLevel(level: number): number {
  if (level >= HEART_TREE_MAX_LEVEL) return Infinity;
  return 40 + (level - 1) * 20;
}

/** 浇水基础 EXP（会被肥料 Buff 放大） */
export const WATER_BASE_EXP = 12;

/** 施肥 Buff 倍率（+30% EXP） */
export const FERTILIZER_MULTIPLIER = 1.3;

/** 施肥 Buff 持续天数 */
export const FERTILIZER_DAYS = 7;

/** 本模块在 localStorage 中的存储 Key */
const STORAGE_KEY = 'heartTreeExpState';

// ------- EXP 来源基础值 -------

/** 完成一次"达标专注"（≥ 最小时长） */
export const EXP_FOCUS_COMPLETED = 15;

/** 完成一次"未达标专注"（但 ≥ 起步门槛，如 3min） */
export const EXP_FOCUS_BASIC = 6;

/** 勾选一个小目标（goal check） */
export const EXP_GOAL_CHECKED = 5;

/** 完成一个里程碑（milestone） */
export const EXP_MILESTONE = 30;

/** 写完一则小结（summary） */
export const EXP_SUMMARY = 8;

/** 连续专注满一天（streak+1，当天至少一次达标） */
export const EXP_STREAK_DAY = 10;

// ------- 状态读写 -------

export function loadHeartTreeExpState(): HeartTreeExpState {
  if (typeof window === 'undefined') {
    return {
      level: 1,
      currentExp: 0,
      totalExp: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        level: 1,
        currentExp: 0,
        totalExp: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<HeartTreeExpState>;

    const level = typeof parsed.level === 'number' && parsed.level > 0
      ? Math.min(parsed.level, HEART_TREE_MAX_LEVEL)
      : 1;
    const totalExp = typeof parsed.totalExp === 'number' && parsed.totalExp >= 0
      ? parsed.totalExp
      : 0;

    // 如果缺失 currentExp，则按当前 level 和 totalExp 回推
    let currentExp = typeof parsed.currentExp === 'number' && parsed.currentExp >= 0
      ? parsed.currentExp
      : 0;

    // 简单校正：如果 currentExp 大于该等级所需，则重新规范化
    const needed = expToNextLevel(level);
    if (Number.isFinite(needed) && currentExp > needed) {
      currentExp = needed;
    }

    const state: HeartTreeExpState = {
      level,
      currentExp,
      totalExp,
      fertilizerBuff: parsed.fertilizerBuff,
      lastWateredDate: parsed.lastWateredDate,
    };

    return normalizeHeartTreeState(state);
  } catch {
    return {
      level: 1,
      currentExp: 0,
      totalExp: 0,
    };
  }
}

export function saveHeartTreeExpState(state: HeartTreeExpState): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeHeartTreeState(state);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

// ------- 核心算法 -------

/** 规范化状态：处理越界等级、过期 Buff 等 */
export function normalizeHeartTreeState(state: HeartTreeExpState): HeartTreeExpState {
  const now = new Date();

  // 限制等级范围
  let level = Math.min(Math.max(state.level || 1, 1), HEART_TREE_MAX_LEVEL);

  // 确保 totalExp 非负
  let totalExp = Math.max(state.totalExp || 0, 0);

  // currentExp 与 expToNext 校正
  let currentExp = Math.max(state.currentExp || 0, 0);
  const needed = expToNextLevel(level);
  if (Number.isFinite(needed) && currentExp > needed) {
    currentExp = needed;
  }

  // 过期 Buff 清理
  let fertilizerBuff = state.fertilizerBuff;
  if (fertilizerBuff) {
    const expiresAt = new Date(fertilizerBuff.expiresAt);
    if (!fertilizerBuff.multiplier || expiresAt.getTime() <= now.getTime()) {
      fertilizerBuff = undefined;
    }
  }

  return {
    level,
    currentExp,
    totalExp,
    fertilizerBuff,
    lastWateredDate: state.lastWateredDate,
  };
}

/** 计算当前是否有有效的施肥 Buff，以及对应倍率 */
export function getFertilizerMultiplier(state: HeartTreeExpState, now: Date = new Date()): number {
  const buff = state.fertilizerBuff;
  if (!buff) return 1;
  const expiresAt = new Date(buff.expiresAt);
  if (expiresAt.getTime() <= now.getTime() || !buff.multiplier) {
    return 1;
  }
  return buff.multiplier;
}

/** 将「基础 EXP」应用当前 Buff，返回实际获得的 EXP（已经四舍五入） */
export function applyExpGain(baseExp: number, state: HeartTreeExpState, now: Date = new Date()): number {
  const multiplier = getFertilizerMultiplier(state, now);
  const gained = Math.round(baseExp * multiplier);
  return Math.max(gained, 0);
}

/** 向心树添加经验，并自动处理升级 */
export function addExp(state: HeartTreeExpState, gained: number): HeartTreeExpState {
  let { level, currentExp, totalExp } = state;

  if (gained <= 0) {
    return normalizeHeartTreeState({ ...state });
  }

  totalExp += gained;

  // 如果已经满级，只累积 totalExp，不再升级
  if (level >= HEART_TREE_MAX_LEVEL) {
    return normalizeHeartTreeState({
      ...state,
      totalExp,
    });
  }

  currentExp += gained;

  while (level < HEART_TREE_MAX_LEVEL) {
    const needed = expToNextLevel(level);
    if (!Number.isFinite(needed)) break;
    if (currentExp < needed) break;

    currentExp -= needed;
    level += 1;
  }

  // 满级时不再关心 currentExp 的绝对值
  const nextNeeded = expToNextLevel(level);
  if (!Number.isFinite(nextNeeded)) {
    currentExp = 0;
  }

  return normalizeHeartTreeState({
    ...state,
    level,
    currentExp,
    totalExp,
  });
}

/** 便捷方法：直接获得 EXP（自动加载、应用 Buff、保存） */
export function gainHeartTreeExp(baseExp: number, now: Date = new Date()): HeartTreeExpState {
  const state = loadHeartTreeExpState();
  const gained = applyExpGain(baseExp, state, now);
  const updated = addExp(state, gained);
  saveHeartTreeExpState(updated);
  return updated;
}

// ------- 浇水 / 施肥 逻辑 -------

/** 判断今天是否可以浇水（不考虑「水的机会」，只考虑当天频次和专注完成条件） */
export function canWaterToday(
  state: HeartTreeExpState,
  today: string,
  hasCompletedFocusToday: boolean,
): boolean {
  if (!hasCompletedFocusToday) return false;
  if (state.lastWateredDate === today) return false;
  return true;
}

/** 执行浇水操作（不检查 hasCompletedFocusToday，由调用方控制条件） */
export function waterTree(
  state: HeartTreeExpState,
  now: Date = new Date(),
  baseExp: number = WATER_BASE_EXP,
): HeartTreeExpState {
  const today = now.toISOString().split('T')[0];
  const gained = applyExpGain(baseExp, state, now);
  const updated = addExp(state, gained);

  const finalState: HeartTreeExpState = {
    ...updated,
    lastWateredDate: today,
  };

  saveHeartTreeExpState(finalState);
  return finalState;
}

/** 授予 / 启动施肥 Buff（不叠加，仅覆盖现有 Buff） */
export function grantFertilizerBuff(
  state: HeartTreeExpState,
  now: Date = new Date(),
  multiplier: number = FERTILIZER_MULTIPLIER,
  days: number = FERTILIZER_DAYS,
): HeartTreeExpState {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + days);

  const updated: HeartTreeExpState = {
    ...state,
    fertilizerBuff: {
      multiplier,
      expiresAt: expiresAt.toISOString(),
    },
  };

  saveHeartTreeExpState(updated);
  return updated;
}

// ------- 视图辅助：等级进度 / 提示文案 -------

export interface HeartTreeLevelView {
  level: number;
  /** 当前等级内的 EXP */
  currentExp: number;
  /** 升到下一级所需 EXP（满级时为 Infinity） */
  expToNext: number;
  /** 当前等级进度 0-100（满级时为 100） */
  progress: number;
}

export function getHeartTreeLevelView(state: HeartTreeExpState): HeartTreeLevelView {
  const normalized = normalizeHeartTreeState(state);
  const expToNextVal = expToNextLevel(normalized.level);

  if (!Number.isFinite(expToNextVal)) {
    return {
      level: normalized.level,
      currentExp: 0,
      expToNext: Infinity,
      progress: 100,
    };
  }

  const progress = Math.max(
    0,
    Math.min(100, Math.round((normalized.currentExp / expToNextVal) * 100)),
  );

  return {
    level: normalized.level,
    currentExp: normalized.currentExp,
    expToNext: expToNextVal,
    progress,
  };
}


