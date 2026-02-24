export const MAX_RECENT_GOALS = 10;

const normalizeTitle = (title: string) => title.trim();

const getHistoryKey = (userId?: string) => `recentGoalHistory:${userId || 'anonymous'}`;

export const getRecentGoalHistory = (userId?: string, limit = MAX_RECENT_GOALS): string[] => {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(getHistoryKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === 'string' ? normalizeTitle(item) : ''))
      .filter(Boolean)
      .slice(0, limit);
  } catch {
    return [];
  }
};

export const rememberGoalTitle = (userId: string | undefined, title: string) => {
  if (typeof window === 'undefined') return;

  const normalized = normalizeTitle(title);
  if (!normalized) return;

  const current = getRecentGoalHistory(userId, MAX_RECENT_GOALS);
  const deduped = [normalized, ...current.filter((item) => item !== normalized)].slice(
    0,
    MAX_RECENT_GOALS
  );
  localStorage.setItem(getHistoryKey(userId), JSON.stringify(deduped));
};
