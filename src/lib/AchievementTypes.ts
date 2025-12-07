// 成就等级颜色定义
export const ACHIEVEMENT_COLORS = {
  COMMON: { bg: '#9CA3AF', name: '基础', className: 'bg-gray-400' },
  UNCOMMON: { bg: '#10B981', name: '进阶', className: 'bg-green-400' },
  RARE: { bg: '#3B82F6', name: '稀有', className: 'bg-blue-400' },
  EPIC: { bg: '#8B5CF6', name: '史诗', className: 'bg-purple-400' },
  LEGENDARY: { bg: '#F59E0B', name: '传说', className: 'bg-yellow-400' },
  MYTHIC: { bg: 'gradient', name: '神话', className: 'bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500' },
};

// 成就类型枚举
export enum AchievementType {
  FLOW_INDEX = 'flow_index',           // 心流指数
  SUMMARY_COUNT = 'summary_count',     // 累计小结
  SUMMARY_STREAK = 'summary_streak',   // 连续小结
  TOTAL_TIME = 'total_time',           // 总专注时长
  DAILY_TIME = 'daily_time',           // 单日时长
  FOCUS_STREAK = 'focus_streak',       // 连续专注
  MILESTONE_COUNT = 'milestone_count', // 累计小目标
  DAILY_MILESTONES = 'daily_milestones', // 单日小目标
  PROJECT_COUNT = 'project_count',     // 完成项目
  HIGH_QUALITY = 'high_quality',        // 高评分
  SPECIAL_TIME = 'special_time',       // 特殊时段
  INTENSITY = 'intensity',             // 专注强度
}

// 成就等级枚举
export type AchievementRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

// 成就接口
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  type: AchievementType;
  target: number;
  achieved: boolean;
  achievedAt?: string;
  currentProgress: number;
  repeatable: boolean;
}

// 心流指数成就
export const FLOW_INDEX_ACHIEVEMENTS: Achievement[] = [
  { id: 'flow_60', name: '心流入门', description: '单次心流指数达到60分', icon: '🌊', rarity: 'UNCOMMON', type: AchievementType.FLOW_INDEX, target: 60, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'flow_80', name: '心流掌控', description: '单次心流指数达到80分', icon: '🌌', rarity: 'RARE', type: AchievementType.FLOW_INDEX, target: 80, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'flow_90', name: '心流大师', description: '单次心流指数达到90分', icon: '🌀', rarity: 'EPIC', type: AchievementType.FLOW_INDEX, target: 90, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'flow_95', name: '心流宗师', description: '单次心流指数达到95分', icon: '💎', rarity: 'LEGENDARY', type: AchievementType.FLOW_INDEX, target: 95, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'flow_100', name: '心流之神', description: '单次心流指数达到100分', icon: '✨', rarity: 'MYTHIC', type: AchievementType.FLOW_INDEX, target: 100, achieved: false, currentProgress: 0, repeatable: true },
];

// 累计小结成就
export const SUMMARY_COUNT_ACHIEVEMENTS: Achievement[] = [
  { id: 'summary_10', name: '记录新手', description: '累计记录10次专注小结', icon: '📝', rarity: 'COMMON', type: AchievementType.SUMMARY_COUNT, target: 10, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'summary_50', name: '反思者', description: '累计记录50次专注小结', icon: '📖', rarity: 'UNCOMMON', type: AchievementType.SUMMARY_COUNT, target: 50, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'summary_100', name: '思考者', description: '累计记录100次专注小结', icon: '🧠', rarity: 'RARE', type: AchievementType.SUMMARY_COUNT, target: 100, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'summary_250', name: '哲学家', description: '累计记录250次专注小结', icon: '📚', rarity: 'EPIC', type: AchievementType.SUMMARY_COUNT, target: 250, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'summary_500', name: '智慧长者', description: '累计记录500次专注小结', icon: '🎓', rarity: 'LEGENDARY', type: AchievementType.SUMMARY_COUNT, target: 500, achieved: false, currentProgress: 0, repeatable: false },
];

// 连续小结成就
export const SUMMARY_STREAK_ACHIEVEMENTS: Achievement[] = [
  { id: 'streak_summary_3', name: '连续记录', description: '连续3天记录专注小结', icon: '🔥', rarity: 'COMMON', type: AchievementType.SUMMARY_STREAK, target: 3, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_summary_7', name: '周记录者', description: '连续7天记录专注小结', icon: '🌟', rarity: 'UNCOMMON', type: AchievementType.SUMMARY_STREAK, target: 7, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_summary_14', name: '双周记录', description: '连续14天记录专注小结', icon: '💫', rarity: 'RARE', type: AchievementType.SUMMARY_STREAK, target: 14, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_summary_30', name: '月记录者', description: '连续30天记录专注小结', icon: '🌙', rarity: 'EPIC', type: AchievementType.SUMMARY_STREAK, target: 30, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_summary_90', name: '季度记录', description: '连续90天记录专注小结', icon: '☀️', rarity: 'LEGENDARY', type: AchievementType.SUMMARY_STREAK, target: 90, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_summary_365', name: '年度记录', description: '连续365天记录专注小结', icon: '🎊', rarity: 'MYTHIC', type: AchievementType.SUMMARY_STREAK, target: 365, achieved: false, currentProgress: 0, repeatable: true },
];

// 总时长成就（小时）
export const TOTAL_TIME_ACHIEVEMENTS: Achievement[] = [
  { id: 'time_10', name: '时间投资者', description: '累计专注10小时', icon: '⏳', rarity: 'COMMON', type: AchievementType.TOTAL_TIME, target: 10, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'time_50', name: '时间管理者', description: '累计专注50小时', icon: '⌛', rarity: 'UNCOMMON', type: AchievementType.TOTAL_TIME, target: 50, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'time_100', name: '时间大师', description: '累计专注100小时', icon: '💎', rarity: 'RARE', type: AchievementType.TOTAL_TIME, target: 100, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'time_250', name: '时间领主', description: '累计专注250小时', icon: '👑', rarity: 'EPIC', type: AchievementType.TOTAL_TIME, target: 250, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'time_500', name: '时间掌控者', description: '累计专注500小时', icon: '🕰️', rarity: 'LEGENDARY', type: AchievementType.TOTAL_TIME, target: 500, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'time_1000', name: '时间之神', description: '累计专注1000小时', icon: '✨', rarity: 'MYTHIC', type: AchievementType.TOTAL_TIME, target: 1000, achieved: false, currentProgress: 0, repeatable: false },
];

// 单日时长成就（小时）
export const DAILY_TIME_ACHIEVEMENTS: Achievement[] = [
  { id: 'daily_2h', name: '深度工作', description: '单日专注2小时', icon: '🏊', rarity: 'UNCOMMON', type: AchievementType.DAILY_TIME, target: 2, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'daily_4h', name: '高效达人', description: '单日专注4小时', icon: '🚀', rarity: 'RARE', type: AchievementType.DAILY_TIME, target: 4, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'daily_6h', name: '专注狂人', description: '单日专注6小时', icon: '🔥', rarity: 'EPIC', type: AchievementType.DAILY_TIME, target: 6, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'daily_8h', name: '时间管理大师', description: '单日专注8小时', icon: '🦸', rarity: 'LEGENDARY', type: AchievementType.DAILY_TIME, target: 8, achieved: false, currentProgress: 0, repeatable: true },
];

// 连续专注成就
export const FOCUS_STREAK_ACHIEVEMENTS: Achievement[] = [
  { id: 'streak_focus_3', name: '三日行者', description: '连续3天专注', icon: '🔥', rarity: 'COMMON', type: AchievementType.FOCUS_STREAK, target: 3, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_focus_7', name: '周专注者', description: '连续7天专注', icon: '💪', rarity: 'UNCOMMON', type: AchievementType.FOCUS_STREAK, target: 7, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_focus_14', name: '双周战士', description: '连续14天专注', icon: '🛡️', rarity: 'RARE', type: AchievementType.FOCUS_STREAK, target: 14, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_focus_30', name: '月辉修行者', description: '连续30天专注', icon: '🌙', rarity: 'EPIC', type: AchievementType.FOCUS_STREAK, target: 30, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_focus_90', name: '季度坚持', description: '连续90天专注', icon: '☀️', rarity: 'LEGENDARY', type: AchievementType.FOCUS_STREAK, target: 90, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_focus_180', name: '半年专注', description: '连续180天专注', icon: '🌟', rarity: 'MYTHIC', type: AchievementType.FOCUS_STREAK, target: 180, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'streak_focus_365', name: '年度专注', description: '连续365天专注', icon: '🎯', rarity: 'MYTHIC', type: AchievementType.FOCUS_STREAK, target: 365, achieved: false, currentProgress: 0, repeatable: true },
];

// 累计小目标成就
export const MILESTONE_COUNT_ACHIEVEMENTS: Achievement[] = [
  { id: 'milestone_10', name: '目标达成者', description: '累计完成10个小目标', icon: '🎯', rarity: 'COMMON', type: AchievementType.MILESTONE_COUNT, target: 10, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'milestone_25', name: '目标猎人', description: '累计完成25个小目标', icon: '🏹', rarity: 'UNCOMMON', type: AchievementType.MILESTONE_COUNT, target: 25, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'milestone_50', name: '目标大师', description: '累计完成50个小目标', icon: '⭐', rarity: 'RARE', type: AchievementType.MILESTONE_COUNT, target: 50, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'milestone_100', name: '目标征服者', description: '累计完成100个小目标', icon: '🌠', rarity: 'EPIC', type: AchievementType.MILESTONE_COUNT, target: 100, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'milestone_250', name: '目标传奇', description: '累计完成250个小目标', icon: '🏆', rarity: 'LEGENDARY', type: AchievementType.MILESTONE_COUNT, target: 250, achieved: false, currentProgress: 0, repeatable: false },
  { id: 'milestone_500', name: '目标之神', description: '累计完成500个小目标', icon: '🌌', rarity: 'MYTHIC', type: AchievementType.MILESTONE_COUNT, target: 500, achieved: false, currentProgress: 0, repeatable: true },
];

// 单日小目标成就
export const DAILY_MILESTONES_ACHIEVEMENTS: Achievement[] = [
  { id: 'daily_m_3', name: '高效一日', description: '单日完成3个小目标', icon: '⚡', rarity: 'UNCOMMON', type: AchievementType.DAILY_MILESTONES, target: 3, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'daily_m_5', name: '超级高效', description: '单日完成5个小目标', icon: '🚀', rarity: 'RARE', type: AchievementType.DAILY_MILESTONES, target: 5, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'daily_m_8', name: '目标狂人', description: '单日完成8个小目标', icon: '🔥', rarity: 'EPIC', type: AchievementType.DAILY_MILESTONES, target: 8, achieved: false, currentProgress: 0, repeatable: true },
  { id: 'daily_m_10', name: '极限挑战', description: '单日完成10个小目标', icon: '🦸', rarity: 'LEGENDARY', type: AchievementType.DAILY_MILESTONES, target: 10, achieved: false, currentProgress: 0, repeatable: true },
];

// 所有成就
export const ALL_ACHIEVEMENTS: Achievement[] = [
  ...FLOW_INDEX_ACHIEVEMENTS,
  ...SUMMARY_COUNT_ACHIEVEMENTS,
  ...SUMMARY_STREAK_ACHIEVEMENTS,
  ...TOTAL_TIME_ACHIEVEMENTS,
  ...DAILY_TIME_ACHIEVEMENTS,
  ...FOCUS_STREAK_ACHIEVEMENTS,
  ...MILESTONE_COUNT_ACHIEVEMENTS,
  ...DAILY_MILESTONES_ACHIEVEMENTS,
];

// 按类型获取成就
export const getAchievementsByType = (type: AchievementType): Achievement[] => {
  return ALL_ACHIEVEMENTS.filter(a => a.type === type);
};

// 获取已获得的成就
export const getAchievedAchievements = (achievements: Achievement[]): Achievement[] => {
  return achievements.filter(a => a.achieved);
};

// 获取未获得的成就
export const getUnachievedAchievements = (achievements: Achievement[]): Achievement[] => {
  return achievements.filter(a => !a.achieved);
};






























