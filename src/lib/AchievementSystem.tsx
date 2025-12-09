export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'flow' | 'time' | 'daily' | 'milestone' | 'first';
  requirement: number;
}

export class AchievementManager {
  private achievedAchievements: Set<string> = new Set();

  constructor() {
    this.loadAchievedAchievements();
  }

  private loadAchievedAchievements() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('achievedAchievements');
      if (stored) {
        try {
          this.achievedAchievements = new Set(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load achievements:', e);
        }
      }
    }
  }

  private saveAchievedAchievements() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('achievedAchievements', JSON.stringify(Array.from(this.achievedAchievements)));
    }
  }

  private unlockAchievement(achievementId: string): Achievement | null {
    if (!this.achievedAchievements.has(achievementId)) {
      this.achievedAchievements.add(achievementId);
      this.saveAchievedAchievements();
      
      // Return the achievement object
      const allAchievements = this.getAllAchievements();
      return allAchievements.find(a => a.id === achievementId) || null;
    }
    return null;
  }

  checkFlowIndexAchievements(score: number): Achievement[] {
    const newAchievements: Achievement[] = [];

    // 按从高到低的顺序检查，确保达到高级别时也能解锁低级别成就
    if (score >= 85 && !this.achievedAchievements.has('flow_master')) {
      const achievement = this.unlockAchievement('flow_master');
      if (achievement) newAchievements.push(achievement);
    }
    if (score >= 70 && !this.achievedAchievements.has('flow_stable')) {
      const achievement = this.unlockAchievement('flow_stable');
      if (achievement) newAchievements.push(achievement);
    }
    if (score >= 55 && !this.achievedAchievements.has('flow_growing')) {
      const achievement = this.unlockAchievement('flow_growing');
      if (achievement) newAchievements.push(achievement);
    }
    if (score >= 40 && !this.achievedAchievements.has('flow_beginner')) {
      const achievement = this.unlockAchievement('flow_beginner');
      if (achievement) newAchievements.push(achievement);
    }

    return newAchievements;
  }

  checkTotalTimeAchievements(hours: number): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    const milestones = [
      { hours: 1, id: 'time_1h' },
      { hours: 10, id: 'time_10h' },
      { hours: 50, id: 'time_50h' },
      { hours: 100, id: 'time_100h' },
      { hours: 500, id: 'time_500h' },
    ];

    for (const milestone of milestones) {
      if (hours >= milestone.hours && !this.achievedAchievements.has(milestone.id)) {
        const achievement = this.unlockAchievement(milestone.id);
        if (achievement) newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  checkDailyTimeAchievements(hours: number): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    const milestones = [
      { hours: 0.5, id: 'daily_30min' },
      { hours: 1, id: 'daily_1h' },
      { hours: 2, id: 'daily_2h' },
      { hours: 4, id: 'daily_4h' },
    ];

    for (const milestone of milestones) {
      if (hours >= milestone.hours && !this.achievedAchievements.has(milestone.id)) {
        const achievement = this.unlockAchievement(milestone.id);
        if (achievement) newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  checkMilestoneAchievements(count: number): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    const milestones = [
      { count: 1, id: 'milestone_first' },
      { count: 10, id: 'milestone_10' },
      { count: 50, id: 'milestone_50' },
      { count: 100, id: 'milestone_100' },
    ];

    for (const milestone of milestones) {
      if (count >= milestone.count && !this.achievedAchievements.has(milestone.id)) {
        const achievement = this.unlockAchievement(milestone.id);
        if (achievement) newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  checkFirstTimeAchievements(type: 'focus' | 'milestone_created' | 'plan_created' | 'plan_completed'): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    const firstTimeMap: Record<string, string> = {
      'focus': 'first_focus',
      'milestone_created': 'first_milestone_created',
      'plan_created': 'first_plan_created',
      'plan_completed': 'first_plan_completed',
      'milestone_completed': 'milestone_first',
    };

    const achievementId = firstTimeMap[type];
    if (achievementId && !this.achievedAchievements.has(achievementId)) {
      const achievement = this.unlockAchievement(achievementId);
      if (achievement) newAchievements.push(achievement);
    }

    return newAchievements;
  }

  getAllAchievements(): Achievement[] {
    return [
      // Flow achievements
      { id: 'flow_beginner', name: '初识心流', description: '心流指数达到40分', icon: '🌱', category: 'flow', requirement: 40 },
      { id: 'flow_growing', name: '成长心流', description: '心流指数达到55分', icon: '🌿', category: 'flow', requirement: 55 },
      { id: 'flow_stable', name: '稳定心流', description: '心流指数达到70分', icon: '⭐', category: 'flow', requirement: 70 },
      { id: 'flow_master', name: '深度心流', description: '心流指数达到85分', icon: '🔥', category: 'flow', requirement: 85 },
      
      // Time achievements
      { id: 'time_1h', name: '时间耕耘者', description: '累计专注1小时', icon: '⏱️', category: 'time', requirement: 1 },
      { id: 'time_10h', name: '专注初学者', description: '累计专注10小时', icon: '📚', category: 'time', requirement: 10 },
      { id: 'time_50h', name: '专注进阶者', description: '累计专注50小时', icon: '🎓', category: 'time', requirement: 50 },
      { id: 'time_100h', name: '专注大师', description: '累计专注100小时', icon: '🏆', category: 'time', requirement: 100 },
      { id: 'time_500h', name: '专注传奇', description: '累计专注500小时', icon: '👑', category: 'time', requirement: 500 },
      
      // Daily achievements
      { id: 'daily_30min', name: '每日起步', description: '单日专注30分钟', icon: '🚀', category: 'daily', requirement: 0.5 },
      { id: 'daily_1h', name: '专注一日', description: '单日专注1小时', icon: '☀️', category: 'daily', requirement: 1 },
      { id: 'daily_2h', name: '深度工作者', description: '单日专注2小时', icon: '💎', category: 'daily', requirement: 2 },
      { id: 'daily_4h', name: '效率之王', description: '单日专注4小时', icon: '👑', category: 'daily', requirement: 4 },
      
      // Milestone achievements
      { id: 'milestone_first', name: '第一颗星', description: '完成第一个小目标', icon: '⭐', category: 'milestone', requirement: 1 },
      { id: 'milestone_10', name: '小目标达人', description: '完成10个小目标', icon: '🎯', category: 'milestone', requirement: 10 },
      { id: 'milestone_50', name: '目标猎手', description: '完成50个小目标', icon: '🏅', category: 'milestone', requirement: 50 },
      { id: 'milestone_100', name: '目标传奇', description: '完成100个小目标', icon: '🌟', category: 'milestone', requirement: 100 },
      
      // First time achievements
      { id: 'first_focus', name: '初出茅庐', description: '第一次完成专注', icon: '🌱', category: 'first', requirement: 1 },
      { id: 'first_milestone_created', name: '小试牛刀', description: '第一次创建小目标', icon: '✨', category: 'first', requirement: 1 },
      { id: 'first_plan_created', name: '规划先行', description: '第一次创建新计划', icon: '📋', category: 'first', requirement: 1 },
      { id: 'first_plan_completed', name: '首战告捷', description: '第一次完成计划', icon: '🎉', category: 'first', requirement: 1 },
    ];
  }

  getAchievementStats() {
    const allAchievements = this.getAllAchievements();
    return {
      total: allAchievements.length,
      achieved: this.achievedAchievements.size,
      progress: Math.round((this.achievedAchievements.size / allAchievements.length) * 100),
    };
  }

  getAchievementsByCategory(category: Achievement['category']) {
    return this.getAllAchievements().filter(a => a.category === category);
  }

  getFirstTimeAchievements(): Achievement[] {
    return this.getAllAchievements().filter(a => a.category === 'first');
  }

  isAchievementUnlocked(achievementId: string): boolean {
    return this.achievedAchievements.has(achievementId);
  }
}

let instance: AchievementManager | null = null;

export function getAchievementManager(): AchievementManager {
  if (!instance) {
    instance = new AchievementManager();
  }
  return instance;
}























