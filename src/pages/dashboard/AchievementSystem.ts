import { 
  Achievement, 
  AchievementType, 
  ALL_ACHIEVEMENTS, 
  FLOW_INDEX_ACHIEVEMENTS,
  TOTAL_TIME_ACHIEVEMENTS,
  DAILY_TIME_ACHIEVEMENTS,
  MILESTONE_COUNT_ACHIEVEMENTS,
} from './AchievementTypes';

// 成就系统管理器
export class AchievementManager {
  private achievements: Achievement[];

  constructor() {
    this.loadAchievements();
  }

  // 加载成就进度
  private loadAchievements(): void {
    const saved = localStorage.getItem('achievements');
    if (saved) {
      this.achievements = JSON.parse(saved);
    } else {
      this.achievements = [...ALL_ACHIEVEMENTS];
      this.saveAchievements();
    }
  }

  // 保存成就进度
  private saveAchievements(): void {
    localStorage.setItem('achievements', JSON.stringify(this.achievements));
  }

  // 获取所有成就
  public getAllAchievements(): Achievement[] {
    return this.achievements;
  }

  // 获取已获得的成就
  public getAchievedAchievements(): Achievement[] {
    return this.achievements.filter(a => a.achieved);
  }

  // 更新成就进度
  public updateAchievementProgress(type: AchievementType, value: number): Achievement[] {
    const newlyAchieved: Achievement[] = [];
    
    const typeAchievements = this.achievements.filter(a => a.type === type && !a.achieved);
    
    for (const achievement of typeAchievements) {
      achievement.currentProgress = value;
      
      if (value >= achievement.target) {
        achievement.achieved = true;
        achievement.achievedAt = new Date().toISOString();
        newlyAchieved.push(achievement);
      }
    }
    
    if (newlyAchieved.length > 0) {
      this.saveAchievements();
    }
    
    return newlyAchieved;
  }

  // 检查心流指数成就
  public checkFlowIndexAchievements(flowIndex: number): Achievement[] {
    return this.updateAchievementProgress(AchievementType.FLOW_INDEX, flowIndex);
  }

  // 检查总时长成就
  public checkTotalTimeAchievements(totalHours: number): Achievement[] {
    return this.updateAchievementProgress(AchievementType.TOTAL_TIME, totalHours);
  }

  // 检查单日时长成就
  public checkDailyTimeAchievements(dailyHours: number): Achievement[] {
    return this.updateAchievementProgress(AchievementType.DAILY_TIME, dailyHours);
  }

  // 检查小目标成就
  public checkMilestoneAchievements(milestoneCount: number): Achievement[] {
    return this.updateAchievementProgress(AchievementType.MILESTONE_COUNT, milestoneCount);
  }

  // 检查单日小目标成就
  public checkDailyMilestoneAchievements(dailyMilestoneCount: number): Achievement[] {
    return this.updateAchievementProgress(AchievementType.DAILY_MILESTONES, dailyMilestoneCount);
  }

  // 获取成就统计
  public getAchievementStats() {
    const all = this.achievements;
    const achieved = all.filter(a => a.achieved);
    
    return {
      total: all.length,
      achieved: achieved.length,
      progress: Math.round((achieved.length / all.length) * 100),
      byRarity: {
        COMMON: all.filter(a => a.rarity === 'COMMON' && a.achieved).length,
        UNCOMMON: all.filter(a => a.rarity === 'UNCOMMON' && a.achieved).length,
        RARE: all.filter(a => a.rarity === 'RARE' && a.achieved).length,
        EPIC: all.filter(a => a.rarity === 'EPIC' && a.achieved).length,
        LEGENDARY: all.filter(a => a.rarity === 'LEGENDARY' && a.achieved).length,
        MYTHIC: all.filter(a => a.rarity === 'MYTHIC' && a.achieved).length,
      }
    };
  }

  // 重置所有成就（测试用）
  public resetAllAchievements(): void {
    this.achievements = [...ALL_ACHIEVEMENTS];
    this.saveAchievements();
  }
}

// 单例实例
let instance: AchievementManager | null = null;

export const getAchievementManager = (): AchievementManager => {
  if (!instance) {
    instance = new AchievementManager();
  }
  return instance;
};


