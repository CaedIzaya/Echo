import React, { useState, useEffect } from 'react';
import { getAchievementManager } from '~/lib/AchievementSystem';

interface AchievementPanelProps {
  onClose: () => void;
}

export default function AchievementPanel({ onClose }: AchievementPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'flow' | 'time' | 'daily' | 'milestone' | 'first' | 'badge'>('all');
  const [stats, setStats] = useState({ total: 0, achieved: 0, progress: 0 });
  const [badges, setBadges] = useState<string[]>([]);

  useEffect(() => {
    const manager = getAchievementManager();
    setStats(manager.getAchievementStats());
    
    // 加载已购买的勋章
    fetch('/api/shop/items')
      .then(res => res.json())
      .then(data => {
        const purchasedBadges = data
          .filter((item: any) => item.type === 'badge' && item.purchased)
          .map((item: any) => item.id);
        setBadges(purchasedBadges);
      })
      .catch(err => console.error('加载勋章失败:', err));
  }, []);

  const manager = getAchievementManager();
  const allAchievements = manager.getAllAchievements();
  
  // 根据选中类别过滤成就
  const filteredAchievements = selectedCategory === 'all'
    ? allAchievements
    : allAchievements.filter(a => a.category === selectedCategory);

  // 获取成就背景渐变色
  const getAchievementGradient = (category: string) => {
    switch(category) {
      case 'flow':
        return 'from-purple-500 to-pink-600';
      case 'time':
        return 'from-blue-500 to-cyan-600';
      case 'daily':
        return 'from-green-500 to-emerald-600';
      case 'milestone':
        return 'from-yellow-500 to-orange-600';
      case 'first':
        return 'from-indigo-500 to-purple-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const categories = [
    { key: 'all', label: '全部', icon: '🏆' },
    { key: 'badge', label: '勋章', icon: '🎖️' },
    { key: 'first', label: '初体验', icon: '🌱' },
    { key: 'flow', label: '心流', icon: '✨' },
    { key: 'time', label: '时长', icon: '⏰' },
    { key: 'daily', label: '每日', icon: '📅' },
    { key: 'milestone', label: '小目标', icon: '🎯' },
  ];
  
  // 勋章数据（按等级排序）
  const badgeData = [
    { id: 'badge_diamond', name: '钻石勋章', icon: '💎', description: '专注带来的永恒闪耀', level: 4 },
    { id: 'badge_gold', name: '黄金勋章', icon: '🥇', description: '证明你的卓越与非凡', level: 3 },
    { id: 'badge_silver', name: '白银勋章', icon: '🥈', description: '展现你的专注与毅力', level: 2 },
    { id: 'badge_bronze', name: '青铜勋章', icon: '🥉', description: '彰显你的努力与坚持', level: 1 },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>🏆</span>
              成就系统
            </h2>
            <p className="text-white/90 text-sm mt-1">
              {stats.achieved} / {stats.total} 已解锁 ({stats.progress}%)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 类别筛选 */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 成就列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 勋章展示区（仅在全部或勋章分类时显示） */}
          {(selectedCategory === 'all' || selectedCategory === 'badge') && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>🎖️</span>
                我的勋章
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {badgeData.map(badge => {
                  const owned = badges.includes(badge.id);
                  
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-2xl p-6 border-2 transition-all ${
                        owned
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-transparent shadow-lg text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-6xl mb-3 opacity-${owned ? 100 : 40}">{badge.icon}</div>
                        <h4 className={`font-bold text-lg mb-2 ${owned ? 'text-white' : 'text-gray-500'}`}>
                          {badge.name}
                        </h4>
                        <p className={`text-sm ${owned ? 'text-white/90' : 'text-gray-400'}`}>
                          {badge.description}
                        </p>
                        <div className="mt-3 text-xs rounded-full px-3 py-1 inline-block ${owned ? 'text-white/80 bg-white/20' : 'text-gray-400 bg-gray-100'}">
                          {owned ? '✓ 已拥有' : '未解锁'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 成就列表（勋章分类时不显示） */}
          {selectedCategory !== 'badge' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => {
              const isUnlocked = manager.isAchievementUnlocked(achievement.id);
              
              return (
                <div
                  key={achievement.id}
                  className={`rounded-2xl p-4 border-2 transition-all ${
                    isUnlocked
                      ? `bg-gradient-to-br ${getAchievementGradient(achievement.category)} border-transparent shadow-lg text-white`
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-4xl flex-shrink-0">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold mb-1 ${isUnlocked ? 'text-white' : 'text-gray-800'}`}>
                        {achievement.name}
                      </h3>
                      <p className={`text-sm ${isUnlocked ? 'text-white/90' : 'text-gray-500'}`}>
                        {achievement.description}
                      </p>
                      {!isUnlocked && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                          <span>所需条件:</span>
                          <span className="font-semibold">
                            {achievement.category === 'flow' && `${achievement.requirement}分心流指数`}
                            {achievement.category === 'time' && `${achievement.requirement}h累计时长`}
                            {achievement.category === 'daily' && `${achievement.requirement}h单日时长`}
                            {achievement.category === 'milestone' && `完成${achievement.requirement}个小目标`}
                            {achievement.category === 'first' && achievement.description}
                          </span>
                        </div>
                      )}
                      {isUnlocked && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-white/80">
                          <span>✓ 已解锁</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* 进度条 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">总进度</span>
            <span className="text-sm font-semibold text-teal-600">{stats.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-teal-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            继续专注，解锁更多成就吧！ 🎯
          </p>
        </div>
      </div>
    </div>
  );
}