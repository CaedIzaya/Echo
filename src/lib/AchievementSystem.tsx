import { getUserStorage, setUserStorage } from '~/lib/userStorage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'flow' | 'time' | 'daily' | 'milestone' | 'first' | 'special';
  requirement: number;
}

export class AchievementManager {
  private achievedAchievements: Set<string> = new Set();
  private databaseSynced: boolean = false;
  private isSyncing: boolean = false;

  constructor() {
    // 不再从localStorage加载，完全依赖数据库
    console.log('[AchievementSystem] 初始化成就系统（等待数据库同步）');
  }

  private getCachedAchievementIds(): string[] {
    if (typeof window === 'undefined') return [];

    const parseIds = (raw: string | null): string[] => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
      } catch {
        return [];
      }
    };

    const scopedIds = parseIds(getUserStorage('achievedAchievements'));
    const globalIds = parseIds(localStorage.getItem('achievedAchievements'));
    const allValidIds = new Set(this.getAllAchievements().map((a) => a.id));

    const merged = [...scopedIds, ...globalIds].filter((id) => allValidIds.has(id));
    const unique = Array.from(new Set(merged));

    if (unique.length > 0) {
      setUserStorage('achievedAchievements', JSON.stringify(unique));
    }

    return unique;
  }

  private syncMissingAchievementsToDatabase(missingIds: string[]) {
    if (typeof window === 'undefined' || missingIds.length === 0) return;

    const allAchievements = this.getAllAchievements();
    void Promise.allSettled(
      missingIds.map((achievementId) => {
        const category = allAchievements.find((a) => a.id === achievementId)?.category ?? 'first';
        return fetch('/api/achievements/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievementId, category }),
        });
      })
    );
  }

  private loadAchievedAchievements() {
    // 已废弃，保留空方法避免错误
  }
  
  /**
   * 从数据库同步成就数据（完全依赖数据库）
   */
  async syncFromDatabase(): Promise<void> {
    if (this.isSyncing) {
      console.log('[AchievementSystem] 正在同步中，跳过');
      return;
    }
    
    this.isSyncing = true;
    
    try {
      const response = await fetch('/api/achievements');
      const cachedIds = this.getCachedAchievementIds();
      const cachedSet = new Set<string>(cachedIds);

      if (response.ok) {
        const data = await response.json();
        
        console.log('[AchievementSystem] 数据库返回:', data);
        
        // 优先数据库，同时兼容本地缓存回填（防止历史数据丢失）
        const achievements = data.achievements || [];
        const dbIds = achievements.map((a: any) => a.id as string);
        const dbAchievements = new Set<string>(dbIds);
        const mergedAchievements = new Set<string>([...dbAchievements, ...cachedSet]);

        this.achievedAchievements = mergedAchievements;
        this.databaseSynced = true;
        
        const missingInDb = cachedIds.filter((id) => !dbAchievements.has(id));
        if (missingInDb.length > 0) {
          console.warn('[AchievementSystem] 检测到本地成就未入库，回填数据库:', missingInDb.length, '个');
          this.syncMissingAchievementsToDatabase(missingInDb);
        }

        setUserStorage('achievedAchievements', JSON.stringify(Array.from(mergedAchievements)));
        console.log('[AchievementSystem] ✅ 成就同步完成:', this.achievedAchievements.size, '个');
      } else {
        console.error('[AchievementSystem] 数据库加载失败:', response.status);
        this.achievedAchievements = cachedSet;
        this.databaseSynced = true;
        console.warn('[AchievementSystem] 使用本地缓存成就:', this.achievedAchievements.size, '个');
      }
    } catch (error) {
      console.error('[AchievementSystem] 数据库同步失败:', error);
      const cachedIds = this.getCachedAchievementIds();
      this.achievedAchievements = new Set(cachedIds);
      this.databaseSynced = true;
      console.warn('[AchievementSystem] 使用本地缓存成就:', this.achievedAchievements.size, '个');
    } finally {
      this.isSyncing = false;
    }
  }

  private saveAchievedAchievements() {
    setUserStorage('achievedAchievements', JSON.stringify(Array.from(this.achievedAchievements)));
  }

  private unlockAchievement(achievementId: string): Achievement | null {
    // 🔥 如果数据库还没同步，拒绝解锁任何成就
    if (!this.databaseSynced) {
      console.warn('[AchievementSystem] ⚠️ 数据库未同步，拒绝解锁:', achievementId);
      return null;
    }
    
    if (!this.achievedAchievements.has(achievementId)) {
      this.achievedAchievements.add(achievementId);
      this.saveAchievedAchievements();
      console.log('[AchievementSystem] ✅ 解锁新成就:', achievementId);
      
      // Return the achievement object
      const allAchievements = this.getAllAchievements();
      return allAchievements.find(a => a.id === achievementId) || null;
    }
    console.log('[AchievementSystem] 成就已存在，跳过:', achievementId);
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

  checkHeartTreeWaterAchievements(count: number): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    const milestones = [
      { count: 10, id: 'water_10' },
      { count: 50, id: 'water_50' },
      { count: 100, id: 'water_100' },
    ];

    for (const milestone of milestones) {
      if (count >= milestone.count && !this.achievedAchievements.has(milestone.id)) {
        const achievement = this.unlockAchievement(milestone.id);
        if (achievement) newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  checkHeartTreeFertilizerAchievements(count: number): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    const milestones = [
      { count: 5, id: 'fertilizer_5' },
      { count: 20, id: 'fertilizer_20' },
      { count: 50, id: 'fertilizer_50' },
    ];

    for (const milestone of milestones) {
      if (count >= milestone.count && !this.achievedAchievements.has(milestone.id)) {
        const achievement = this.unlockAchievement(milestone.id);
        if (achievement) newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  checkHeartTreeLevelAchievements(level: number): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    const milestones = [
      { level: 10, id: 'tree_level_10' },
      { level: 20, id: 'tree_level_20' },
      { level: 30, id: 'tree_level_30' },
    ];

    for (const milestone of milestones) {
      if (level >= milestone.level && !this.achievedAchievements.has(milestone.id)) {
        const achievement = this.unlockAchievement(milestone.id);
        if (achievement) newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  /**
   * 检查"首次"成就
   * 
   * ⚠️ 重要：不再依赖 localStorage 标记
   * 改为直接从已解锁成就列表判断（数据库同步后的数据）
   * 
   * @param type 成就类型
   * @returns 新解锁的成就列表
   */
  checkFirstTimeAchievements(
    type: 'focus' | 'milestone_created' | 'plan_created' | 'plan_completed' | 'milestone_completed',
  ): Achievement[] {
    const newAchievements: Achievement[] = [];
    
    const firstTimeMap: Record<string, string> = {
      'focus': 'first_focus',
      'milestone_created': 'first_milestone_created',
      'plan_created': 'first_plan_created',
      'plan_completed': 'first_plan_completed',
      'milestone_completed': 'milestone_first',
    };

    const achievementId = firstTimeMap[type];
    
    // 关键改进：只检查成就列表，不检查 localStorage 标记
    // 如果成就已在列表中（从数据库同步），则不会重复解锁
    if (achievementId && !this.achievedAchievements.has(achievementId)) {
      const achievement = this.unlockAchievement(achievementId);
      if (achievement) newAchievements.push(achievement);
    }

    return newAchievements;
  }
  
  /**
   * 检查是否已拥有某个成就
   * 
   * @param achievementId 成就ID
   * @returns 是否已解锁
   */
  hasAchievement(achievementId: string): boolean {
    return this.achievedAchievements.has(achievementId);
  }
  
  /**
   * 获取已解锁成就数量
   */
  getAchievementCount(): number {
    return this.achievedAchievements.size;
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
      
      // Heart Tree achievements
      { id: 'water_10', name: '灌溉新手', description: '心树浇水满10次', icon: '💧', category: 'first', requirement: 10 },
      { id: 'water_50', name: '勤勉园丁', description: '心树浇水满50次', icon: '🌊', category: 'first', requirement: 50 },
      { id: 'water_100', name: '水润之源', description: '心树浇水满100次', icon: '💦', category: 'first', requirement: 100 },
      { id: 'fertilizer_5', name: '营养师', description: '心树施肥满5次', icon: '🌱', category: 'first', requirement: 5 },
      { id: 'fertilizer_20', name: '成长专家', description: '心树施肥满20次', icon: '🌿', category: 'first', requirement: 20 },
      { id: 'fertilizer_50', name: '培育大师', description: '心树施肥满50次', icon: '🍀', category: 'first', requirement: 50 },
      { id: 'tree_level_10', name: '茁壮成长', description: '心树等级达到10级', icon: '🌳', category: 'first', requirement: 10 },
      { id: 'tree_level_20', name: '参天之木', description: '心树等级达到20级', icon: '🌲', category: 'first', requirement: 20 },
      { id: 'tree_level_30', name: '生命古树', description: '心树等级达到30级', icon: '🎄', category: 'first', requirement: 30 },

      // Special achievements
      { id: 'night_owl', name: '夜猫子', description: '在22:30~次日3:00区间上线7次', icon: '🦉', category: 'special', requirement: 7 },
      { id: 'night_walker', name: '深夜行者', description: '在22:30~次日3:00启动并完成一次达标专注', icon: '🌙', category: 'special', requirement: 1 },
      { id: 'dawn_witness', name: '晨曦见证者', description: '在5:30~8:30区间上线7次', icon: '🌅', category: 'special', requirement: 7 },
      { id: 'morning_walker', name: '清晨行者', description: '在5:30~8:30启动并完成一次达标专注', icon: '🌄', category: 'special', requirement: 1 },
      { id: 'afternoon_tea', name: '下午茶', description: '在13:00~15:30期间完成一次烹饪类达标专注', icon: '☕', category: 'special', requirement: 1 },
      { id: 'morning_exercise', name: '晨练者', description: '在6:30~9:30期间完成一次运动类达标专注', icon: '🏃', category: 'special', requirement: 1 },
      { id: 'morning_reading', name: '晨读', description: '在6:30~9:30期间完成一次阅读类达标专注', icon: '📖', category: 'special', requirement: 1 },
      { id: 'bedtime_reading', name: '睡前阅读', description: '在21:30~24:00期间完成一次阅读类达标专注', icon: '📚', category: 'special', requirement: 1 },
      { id: 'hardcore_gamer', name: '爆肝选手', description: '在24:00~3:00期间完成一次游戏类达标专注', icon: '🎮', category: 'special', requirement: 1 },
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

  /**
   * 判断时间是否在指定的小时区间内（支持跨午夜）
   * startHour/endHour 用小数表示，如 22:30 → 22.5，3:00 → 3
   */
  private isInTimeWindow(date: Date, startHour: number, endHour: number): boolean {
    const h = date.getHours() + date.getMinutes() / 60;
    if (startHour <= endHour) {
      return h >= startHour && h < endHour;
    }
    // 跨午夜：22:30~3:00 → h >= 22.5 || h < 3
    return h >= startHour || h < endHour;
  }

  /**
   * 检查并记录特殊时段上线，返回新解锁成就
   * 在 Dashboard 加载时调用
   */
  checkSpecialVisitAchievements(): Achievement[] {
    if (typeof window === 'undefined') return [];
    const now = new Date();
    const newAchievements: Achievement[] = [];

    const visitConfigs: { id: string; key: string; startH: number; endH: number; target: number }[] = [
      { id: 'night_owl', key: 'special_night_owl_visits', startH: 22.5, endH: 3, target: 7 },
      { id: 'dawn_witness', key: 'special_dawn_witness_visits', startH: 5.5, endH: 8.5, target: 7 },
    ];

    for (const cfg of visitConfigs) {
      if (this.achievedAchievements.has(cfg.id)) continue;
      if (!this.isInTimeWindow(now, cfg.startH, cfg.endH)) continue;

      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      let visits: string[] = [];
      try {
        const raw = getUserStorage(cfg.key);
        if (raw) visits = JSON.parse(raw) as string[];
      } catch { /* ignore */ }

      if (!visits.includes(todayKey)) {
        visits.push(todayKey);
        setUserStorage(cfg.key, JSON.stringify(visits));
      }

      if (visits.length >= cfg.target) {
        const a = this.unlockAchievement(cfg.id);
        if (a) newAchievements.push(a);
      }
    }

    return newAchievements;
  }

  /**
   * 检查基于专注完成的特殊成就
   * @param startTime   专注开始时间
   * @param isMinMet    是否达到最小专注时长
   * @param domainKey   计划所属的兴趣域 key（如 'game','reading','sports','food'）
   */
  checkSpecialFocusAchievements(
    startTime: Date,
    isMinMet: boolean,
    domainKey?: string,
  ): Achievement[] {
    const newAchievements: Achievement[] = [];
    if (!isMinMet) return newAchievements;

    const focusChecks: { id: string; startH: number; endH: number; domain?: string }[] = [
      { id: 'night_walker',     startH: 22.5, endH: 3 },
      { id: 'morning_walker',   startH: 5.5,  endH: 8.5 },
      { id: 'afternoon_tea',    startH: 13,   endH: 15.5,  domain: 'food' },
      { id: 'morning_exercise', startH: 6.5,  endH: 9.5,   domain: 'sports' },
      { id: 'morning_reading',  startH: 6.5,  endH: 9.5,   domain: 'reading' },
      { id: 'bedtime_reading',  startH: 21.5, endH: 24,    domain: 'reading' },
      { id: 'hardcore_gamer',   startH: 0,    endH: 3,     domain: 'game' },
    ];

    for (const chk of focusChecks) {
      if (this.achievedAchievements.has(chk.id)) continue;
      if (chk.domain && domainKey !== chk.domain) continue;
      if (!this.isInTimeWindow(startTime, chk.startH, chk.endH)) continue;

      const a = this.unlockAchievement(chk.id);
      if (a) newAchievements.push(a);
    }

    return newAchievements;
  }
}

let instance: AchievementManager | null = null;

export function getAchievementManager(): AchievementManager {
  if (!instance) {
    instance = new AchievementManager();
  }
  return instance;
}























