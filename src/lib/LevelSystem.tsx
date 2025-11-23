export interface UserLevel {
  currentLevel: number;
  currentExp: number;
  totalExp: number;
  title: string;
  nextLevelExp: number;
  progress: number; // 0-100
  cycle: number; // 轮回次数 (每60级+1)
  unlockedFeatures: string[];
}

export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  range: { min: number; max: number };
}

export class LevelManager {
  private static readonly LEVEL_TITLES: Record<number, string> = {
    1: '专注新人', 5: '时间学徒', 10: '新手毕业',
    11: '进阶学者', 15: '心流探索者', 20: '进阶认证',
    21: '熟练工', 25: '专注专家', 30: '时间管理者',
    31: '领域专家', 35: '心流大师', 40: '专家认证',
    41: '大师之路', 45: '金牌策划', 50: '时间大师',
    51: '宗师之路', 55: '传奇之路', 60: '时间夺还者',
    61: '传奇诞生', 70: '史诗传说', 80: '神话归来', 99: '时间之神'
  };

  private static readonly LEVEL_COLORS = {
    0: '#9CA3AF',    // 1-10: 灰色
    10: '#10B981',   // 11-20: 绿色
    20: '#3B82F6',   // 21-30: 蓝色
    30: '#8B5CF6',   // 31-40: 紫色
    40: '#F59E0B',   // 41-50: 金色
    50: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // 51-60: 钻石
    60: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' // 61+: 传奇
  };

  static getLevelColor(level: number): string {
    if (level <= 10) return this.LEVEL_COLORS[0];
    if (level <= 20) return this.LEVEL_COLORS[10];
    if (level <= 30) return this.LEVEL_COLORS[20];
    if (level <= 40) return this.LEVEL_COLORS[30];
    if (level <= 50) return this.LEVEL_COLORS[40];
    if (level <= 60) return this.LEVEL_COLORS[50];
    return this.LEVEL_COLORS[60];
  }

  static getLevelTitle(level: number): string {
    // 精确匹配
    if (this.LEVEL_TITLES[level]) return this.LEVEL_TITLES[level];
    
    // 范围匹配
    const ranges = [
      { min: 61, max: 70, title: '传奇新生' },
      { min: 51, max: 60, title: '宗师之路' },
      { min: 41, max: 50, title: '大师之路' },
      { min: 31, max: 40, title: '领域专家' },
      { min: 21, max: 30, title: '熟练工' },
      { min: 11, max: 20, title: '进阶学者' },
      { min: 1, max: 10, title: '专注新人' }
    ];

    for (const range of ranges) {
      if (level >= range.min && level <= range.max) {
        return range.title;
      }
    }

    return '初学者';
  }

  static getLevelInfo(level: number): LevelInfo {
    return {
      level,
      title: this.getLevelTitle(level),
      color: this.getLevelColor(level),
      range: this.getLevelRange(level)
    };
  }

  static getLevelRange(level: number): { min: number; max: number } {
    if (level <= 10) return { min: 1, max: 10 };
    if (level <= 20) return { min: 11, max: 20 };
    if (level <= 30) return { min: 21, max: 30 };
    if (level <= 40) return { min: 31, max: 40 };
    if (level <= 50) return { min: 41, max: 50 };
    if (level <= 60) return { min: 51, max: 60 };
    return { min: 61, max: 99 };
  }

  static getExpRequiredForLevel(level: number): number {
    if (level <= 10) return 100;      // 新手
    if (level <= 20) return 200;     // 进阶
    if (level <= 30) return 300;     // 熟练
    if (level <= 40) return 400;     // 专家
    if (level <= 50) return 500;     // 大师
    if (level <= 60) return 600;     // 宗师
    return 1000;                      // 传奇
  }

  static getExpForNextLevel(currentLevel: number): number {
    return this.getExpRequiredForLevel(currentLevel + 1);
  }

  static calculateLevel(exp: number): UserLevel {
    let totalExp = exp;
    let currentLevel = 1;
    let currentExp = 0;
    
    // 计算当前等级
    let expNeeded = this.getExpRequiredForLevel(1);
    while (totalExp >= expNeeded && currentLevel < 99) {
      totalExp -= expNeeded;
      currentLevel++;
      expNeeded = this.getExpRequiredForLevel(currentLevel);
    }
    currentExp = Math.floor(totalExp);
    
    const nextLevelExp = this.getExpRequiredForLevel(currentLevel);
    const progress = Math.floor((currentExp / nextLevelExp) * 100);
    const cycle = Math.floor((currentLevel - 1) / 60);
    
    return {
      currentLevel,
      currentExp,
      totalExp: exp,
      title: this.getLevelTitle(currentLevel),
      nextLevelExp,
      progress,
      cycle,
      unlockedFeatures: []
    };
  }

  // 计算专注会话的经验值
  static calculateSessionExp(sessionMinutes: number, rating?: number, streakDays: number = 0): number {
    let exp = sessionMinutes; // 1分钟 = 1 EXP
    
    // 质量加成
    if (rating === 3) {
      exp = Math.floor(exp * 1.5); // 3星 = 额外50%
    } else if (rating === 2) {
      exp = Math.floor(exp * 1.1); // 2星 = 额外10%
    }
    
    // 连续天数加成（最多7天）
    const streakBonus = Math.min(streakDays, 7) * 10;
    exp += streakBonus;
    
    return exp;
  }

  // 计算小目标完成经验值
  static calculateMilestoneExp(): number {
    return 5; // 每个小目标5 EXP
  }

  // 计算成就解锁经验值
  static calculateAchievementExp(rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'): number {
    const multiplier = {
      'common': 1,
      'uncommon': 2,
      'rare': 5,
      'epic': 10,
      'legendary': 20
    };
    return 20 * multiplier[rarity];
  }

  // 计算项目完成经验值
  static calculateProjectExp(): number {
    return 100; // 每个项目100 EXP
  }
}

let levelInstance: LevelManager | null = null;

export function getLevelManager(): LevelManager {
  if (!levelInstance) {
    levelInstance = new LevelManager();
  }
  return levelInstance;
}


















