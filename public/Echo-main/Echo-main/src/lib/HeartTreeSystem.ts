// 心树系统数据管理

export interface HeartTree {
  level: number;           // 当前等级
  growthPoints: number;    // 成长值
  stage: 'seedling' | 'sapling' | 'adult'; // 成长阶段
  lastWatered: string | null;      // 最后浇水时间 (ISO string)
  lastFertilized: string | null;   // 最后施肥时间 (ISO string)
  growthBoost: number;     // 成长值加成 (0-100%)
  bloomState: 'none' | 'budding' | 'blooming'; // 开花状态
  messages: string[];      // 小树说过的话
  lastMessageTime: string | null; // 最后说话时间
  totalWatered: number;    // 总浇水次数
  totalFertilized: number; // 总施肥次数
}

// 成长阶段阈值
export const GROWTH_THRESHOLDS = {
  seedling: 0,     // 幼苗: 0-99
  sapling: 100,    // 小树: 100-499  
  adult: 500       // 成年树: 500+
};

// 小树名言库（旧版占位，实际文案统一由 heartTreeDialogue 接管）
export const treeMessages = {
  seedling: [] as string[],
  sapling: [] as string[],
  adult: [] as string[],
  blooming: [] as string[],
};

import { getRandomHeartTreeMessage } from './heartTreeDialogue';

// 心树管理器
export class HeartTreeManager {
  private static readonly STORAGE_KEY = 'heartTree';
  
  // 初始化心树
  static initialize(): HeartTree {
    const existing = this.load();
    if (existing) {
      return existing;
    }
    
    return {
      level: 1,
      growthPoints: 0,
      stage: 'seedling',
      lastWatered: null,
      lastFertilized: null,
      growthBoost: 0,
      bloomState: 'none',
      messages: [],
      lastMessageTime: null,
      totalWatered: 0,
      totalFertilized: 0
    };
  }
  
  // 保存到localStorage
  static save(tree: HeartTree): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tree));
    }
  }
  
  // 从localStorage加载
  static load(): HeartTree | null {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  }
  
  // 获取当前心树
  static getTree(): HeartTree {
    return this.load() || this.initialize();
  }
  
  // 计算成长阶段
  static calculateStage(growthPoints: number): 'seedling' | 'sapling' | 'adult' {
    if (growthPoints < GROWTH_THRESHOLDS.sapling) return 'seedling';
    if (growthPoints < GROWTH_THRESHOLDS.adult) return 'sapling';
    return 'adult';
  }
  
  // 计算等级
  static calculateLevel(growthPoints: number): number {
    // 每100点成长值升一级
    return Math.floor(growthPoints / 100) + 1;
  }
  
  // 浇水
  static waterTree(tree: HeartTree, times: number = 1): HeartTree {
    const baseGrowth = 5; // 每次浇水基础成长值
    const boostedGrowth = baseGrowth * (1 + tree.growthBoost / 100);
    const totalGrowth = boostedGrowth * times;
    
    const newGrowthPoints = tree.growthPoints + totalGrowth;
    const newStage = this.calculateStage(newGrowthPoints);
    const newLevel = this.calculateLevel(newGrowthPoints);
    
    // 检查是否有阶段提升
    const stageUp = newStage !== tree.stage;
    
    const updated: HeartTree = {
      ...tree,
      growthPoints: newGrowthPoints,
      stage: newStage,
      level: newLevel,
      lastWatered: new Date().toISOString(),
      totalWatered: tree.totalWatered + times,
      growthBoost: tree.growthBoost > 0 ? Math.max(0, tree.growthBoost - 5) : 0 // 每次浇水后减少5%加成
    };
    
    this.save(updated);
    return updated;
  }
  
  // 施肥
  static fertilizeTree(tree: HeartTree, times: number = 1): HeartTree {
    const growthPoints = 25; // 每次施肥成长值
    const boostAmount = 50;  // 明日成长加成50%
    
    const totalGrowth = growthPoints * times;
    const newGrowthPoints = tree.growthPoints + totalGrowth;
    const newStage = this.calculateStage(newGrowthPoints);
    const newLevel = this.calculateLevel(newGrowthPoints);
    
    const updated: HeartTree = {
      ...tree,
      growthPoints: newGrowthPoints,
      stage: newStage,
      level: newLevel,
      lastFertilized: new Date().toISOString(),
      growthBoost: Math.min(100, tree.growthBoost + (boostAmount * times)), // 最多100%
      totalFertilized: tree.totalFertilized + times
    };
    
    this.save(updated);
    return updated;
  }
  
  // 检查开花条件
  static checkBloomState(
    tree: HeartTree, 
    currentFlowIndex: number, 
    flowIndexIncrease: number
  ): 'none' | 'budding' | 'blooming' {
    // 高心流指数开花
    if (currentFlowIndex >= 80) {
      return 'blooming';
    }
    
    // 心流指数提升5点以上
    if (flowIndexIncrease >= 5) {
      return 'budding';
    }
    
    // 如果心流指数下降，逐渐失去开花状态
    if (tree.bloomState !== 'none' && currentFlowIndex < 70) {
      return 'none';
    }
    
    return tree.bloomState;
  }
  
  // 检查是否应该落花
  static shouldDropFlower(
    tree: HeartTree, 
    streakDays: number, 
    isHighFlow: boolean
  ): boolean {
    // 基础概率
    let probability = 0.05; // 5%
    
    // 开花状态增加概率
    if (tree.bloomState === 'blooming') probability += 0.3;
    if (tree.bloomState === 'budding') probability += 0.15;
    
    // 连续专注天数增加概率
    probability += Math.min(streakDays * 0.02, 0.2);
    
    // 高心流状态增加概率
    if (isHighFlow) probability += 0.1;
    
    return Math.random() < probability;
  }
  
  // 获取落花内容（改为使用新的心树文案池）
  static getFlowerContent(userData: {
    weeklyLongestSession?: number;
    monthlyStreak?: number;
    weeklyNewAchievements?: string[];
    currentFlowIndex?: number;
  }): string {
    // 花瓣落下时的文案也统一走心树深度文案库，避免旧版“今天很好”占位感
    return getRandomHeartTreeMessage();
  }
  
  // 获取随机消息
  static getRandomMessage(tree: HeartTree): string {
    const stageMessages = treeMessages[tree.stage] || [];
    const availableMessages = [...stageMessages];
    
    // 如果处于开花状态，添加开花相关消息
    if (tree.bloomState !== 'none') {
      availableMessages.push(...treeMessages.blooming);
    }
    
    // 避免重复最近的消息（只检查最近3条）
    const recentMessages = tree.messages.slice(-3);
    const filteredMessages = availableMessages.filter(msg => 
      !recentMessages.includes(msg)
    );
    
    const messagesToChoose = filteredMessages.length > 0 ? filteredMessages : availableMessages;
    const message = messagesToChoose[Math.floor(Math.random() * messagesToChoose.length)];
    
    // 更新消息历史（最多保存10条）
    const updatedMessages = [...tree.messages, message].slice(-10);
    const updated: HeartTree = {
      ...tree,
      messages: updatedMessages,
      lastMessageTime: new Date().toISOString()
    };
    
    this.save(updated);
    
    return message;
  }
  
  // 计算浇水机会
  static calculateWateringOpportunities(userData: {
    todaySessions?: number;
    completedMilestonesToday?: number;
  }): number {
    let opportunities = 0;
    
    // 每次专注完成 +1
    opportunities += userData.todaySessions || 0;
    
    // 每个完成的小目标 +1 (每天最多10个)
    opportunities += Math.min(userData.completedMilestonesToday || 0, 10);
    
    return opportunities;
  }
  
  // 计算施肥机会
  static calculateFertilizingOpportunities(userData: {
    dailyGoalCompleted?: boolean;
    newAchievementsToday?: number;
  }): number {
    let opportunities = 0;
    
    // 完成每日目标 +1
    if (userData.dailyGoalCompleted) opportunities += 1;
    
    // 解锁新成就 +1 (每个)
    opportunities += userData.newAchievementsToday || 0;
    
    return opportunities;
  }
  
  // 重置每日加成（应在每天开始时调用）
  static resetDailyBoost(): void {
    const tree = this.getTree();
    // 保留growthBoost，但可以在新的一天时重置或减少
    // 这里可以根据需求决定是否重置
  }
  
  // 处理专注完成后的浇水机会（累积，不自动浇水）
  static addWaterOpportunityOnFocusComplete(): void {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toISOString().split('T')[0];
    const key = `waterOpportunities`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    
    // 每次专注完成增加一次浇水机会（可以累积）
    localStorage.setItem(key, (current + 1).toString());
  }
  
  // 处理完成100%目标的额外奖励
  static addRewardOnGoalComplete(): void {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastReward = localStorage.getItem(`goalReward_${today}`);
    
    // 今天还没有给过奖励，则给予一次浇水机会和一次施肥机会
    if (!lastReward) {
      const waterKey = `waterOpportunities`;
      const fertilizeKey = `fertilizeOpportunities`;
      const currentWater = parseInt(localStorage.getItem(waterKey) || '0', 10);
      const currentFertilize = parseInt(localStorage.getItem(fertilizeKey) || '0', 10);
      
      localStorage.setItem(waterKey, (currentWater + 1).toString());
      localStorage.setItem(fertilizeKey, (currentFertilize + 1).toString());
      localStorage.setItem(`goalReward_${today}`, 'true');
    }
  }
  
  // 处理小目标完成后的浇水机会（累积）
  static addWaterOpportunityOnMilestoneComplete(milestoneCount: number): void {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toISOString().split('T')[0];
    const key = `milestoneWater_${today}`;
    const lastCount = parseInt(localStorage.getItem(key) || '0', 10);
    
    // 只处理新增的小目标（避免重复）
    if (milestoneCount > lastCount) {
      const waterKey = `waterOpportunities`;
      const current = parseInt(localStorage.getItem(waterKey) || '0', 10);
      const newOpportunities = Math.min(milestoneCount - lastCount, 10); // 最多10次
      
      localStorage.setItem(waterKey, (current + newOpportunities).toString());
      localStorage.setItem(key, milestoneCount.toString());
    }
  }
  
  // 处理每日目标完成后的施肥机会（累积，不自动施肥）
  static addFertilizeOpportunityOnDailyGoalComplete(): void {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastAutoFertilize = localStorage.getItem(`dailyGoalFertilize_${today}`);
    
    // 今天还没有给过施肥机会，则增加一次施肥机会
    if (!lastAutoFertilize) {
      const fertilizeKey = `fertilizeOpportunities`;
      const current = parseInt(localStorage.getItem(fertilizeKey) || '0', 10);
      localStorage.setItem(fertilizeKey, (current + 1).toString());
      localStorage.setItem(`dailyGoalFertilize_${today}`, 'true');
    }
  }
  
  // 处理成就解锁后的施肥机会（累积）
  static addFertilizeOpportunityOnAchievementUnlock(achievementCount: number): void {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toISOString().split('T')[0];
    const key = `achievementFertilize_${today}`;
    const lastCount = parseInt(localStorage.getItem(key) || '0', 10);
    
    // 只处理新增的成就（避免重复）
    if (achievementCount > lastCount) {
      const fertilizeKey = `fertilizeOpportunities`;
      const current = parseInt(localStorage.getItem(fertilizeKey) || '0', 10);
      const newOpportunities = achievementCount - lastCount;
      
      localStorage.setItem(fertilizeKey, (current + newOpportunities).toString());
      localStorage.setItem(key, achievementCount.toString());
    }
  }
  
  // 获取累积的浇水机会
  static getWaterOpportunities(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('waterOpportunities') || '0', 10);
  }
  
  // 获取累积的施肥机会
  static getFertilizeOpportunities(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('fertilizeOpportunities') || '0', 10);
  }
  
  // 使用浇水机会
  static useWaterOpportunity(): void {
    if (typeof window === 'undefined') return;
    const current = this.getWaterOpportunities();
    if (current > 0) {
      localStorage.setItem('waterOpportunities', (current - 1).toString());
    }
  }
  
  // 使用施肥机会
  static useFertilizeOpportunity(): void {
    if (typeof window === 'undefined') return;
    const current = this.getFertilizeOpportunities();
    if (current > 0) {
      localStorage.setItem('fertilizeOpportunities', (current - 1).toString());
    }
  }
}







































