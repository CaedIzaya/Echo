/**
 * Dashboard 组件集成示例
 * 
 * 这个文件展示如何在 src/pages/dashboard/index.tsx 中集成新的 Hooks
 * 只展示需要修改的关键部分
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
// ... 其他 imports

// ========== 新增：导入持久化 Hooks ==========
import { useUserExp } from '~/hooks/useUserExp';
import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';
import { useAchievements } from '~/hooks/useAchievements';

export default function DashboardPage() {
  // ========== 新增：使用持久化 Hooks（必须在最前面）==========
  const { userExp, userLevel: hookUserLevel, addUserExp, updateUserExp } = useUserExp();
  const { expState: heartTreeExpState, updateExpState: updateHeartTreeExpState } = useHeartTreeExp();
  const { unlockAchievement, isAchievementUnlocked } = useAchievements();
  
  // ========== 原有的 state 声明 ==========
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userLevel, setUserLevel] = useState<UserLevel>({
    level: 1,
    currentExp: 0,
    expToNext: 100,
    progress: 0,
  });
  
  // ... 其他 state 声明
  
  // ========== 新增：同步用户等级 ==========
  useEffect(() => {
    if (hookUserLevel > 0) {
      const levelInfo = LevelManager.calculateLevel(userExp);
      setUserLevel(levelInfo);
    }
  }, [hookUserLevel, userExp]);
  
  // ========== 修改1：小精灵点击事件 ==========
  // 旧代码（删除这些行）：
  // const spiritExp = LevelManager.calculateSpiritInteractionExp();
  // const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
  // const newExp = currentExp + spiritExp;
  // localStorage.setItem('userExp', newExp.toString());
  // localStorage.setItem('lastSpiritInteractionDate', today);
  // setUserLevel(LevelManager.calculateLevel(newExp));
  
  // 新代码：
  const handleSpiritClick = async () => {
    const today = getTodayDate();
    if (typeof window !== 'undefined') {
      const lastSpiritInteractionDate = localStorage.getItem('lastSpiritInteractionDate');
      if (lastSpiritInteractionDate !== today) {
        const spiritExp = LevelManager.calculateSpiritInteractionExp();
        await addUserExp(spiritExp); // 👈 使用 Hook
        localStorage.setItem('lastSpiritInteractionDate', today);
        // userLevel 会自动更新，不需要手动 setUserLevel
      }
    }
    // ... 其他逻辑保持不变
  };
  
  // ========== 修改2：完成专注后更新经验 ==========
  // 旧代码（删除）：
  // const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
  // const achievementExp = LevelManager.calculateAchievementExp('common');
  // const totalExp = currentExp + (achievementExp * dailyAchievements.length);
  // localStorage.setItem('userExp', totalExp.toString());
  
  // 新代码：
  const handleDailyAchievements = async (dailyAchievements: any[]) => {
    if (dailyAchievements.length > 0) {
      const achievementExp = LevelManager.calculateAchievementExp('common');
      const totalExpToAdd = achievementExp * dailyAchievements.length;
      await addUserExp(totalExpToAdd); // 👈 使用 Hook
    }
  };
  
  // ========== 修改3：通用经验更新函数 ==========
  // 旧代码（删除整个函数）：
  // const updateUserExp = (minutes: number, rating?: number, ...) => {
  //   const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
  //   ...
  //   localStorage.setItem('userExp', newTotalExp.toString());
  // };
  
  // 新代码（重命名避免冲突）：
  const updateUserExpFromSession = async (
    minutes: number, 
    rating?: number, 
    completed: boolean = true, 
    plannedMinutes?: number
  ) => {
    // 基础经验计算
    const baseExp = LevelManager.calculateFocusExp(minutes);
    
    // 心流加成
    let flowBonus = 0;
    if (rating) {
      flowBonus = LevelManager.calculateFlowBonus(rating);
    }
    
    // 完成度加成
    let completionBonus = 0;
    if (completed && plannedMinutes && minutes >= plannedMinutes) {
      completionBonus = LevelManager.calculateCompletionBonus();
    }
    
    const newTotalExp = baseExp + flowBonus + completionBonus;
    
    // 👈 使用 Hook 更新经验（会自动保存到数据库）
    await updateUserExp(newTotalExp);
  };
  
  // ========== 修改4：成就解锁后更新经验 ==========
  const handleAchievementUnlock = async (newAchievements: any[]) => {
    if (newAchievements.length > 0) {
      // 1. 更新本地成就列表
      setNewAchievements(newAchievements);
      setUnviewedAchievements(newAchievements);
      
      // 2. 同步到数据库 👈 新增
      for (const achievement of newAchievements) {
        await unlockAchievement(achievement.id, achievement.category);
      }
      
      // 3. 添加经验
      const achievementExp = LevelManager.calculateAchievementExp('common');
      const totalExpToAdd = achievementExp * newAchievements.length;
      await addUserExp(totalExpToAdd); // 👈 使用 Hook
      
      console.log(`🎁 解锁${newAchievements.length}个成就，获得${totalExpToAdd} EXP`);
    }
  };
  
  // ========== 修改5：渲染用户信息 ==========
  // 旧代码（删除）：
  // const userExp = parseFloat(localStorage.getItem('userExp') || '0');
  // const levelInfo = LevelManager.calculateLevel(userExp);
  
  // 新代码（直接使用 Hook 的值）：
  return (
    <div>
      {/* 用户等级显示 */}
      <div>
        <p>等级: Lv.{userLevel.level}</p>
        <p>经验: {userExp} / {userLevel.expToNext}</p>
        <div style={{ width: `${userLevel.progress}%` }}>
          {/* 进度条 */}
        </div>
      </div>
      
      {/* 其他组件 */}
    </div>
  );
}

// ========== 完整的修改清单 ==========
/*
需要在 src/pages/dashboard/index.tsx 中修改的位置：

1. 第1-20行：添加 import
   import { useUserExp } from '~/hooks/useUserExp';
   import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';
   import { useAchievements } from '~/hooks/useAchievements';

2. 第430行左右：添加 Hooks 声明
   const { userExp, userLevel: hookUserLevel, addUserExp, updateUserExp } = useUserExp();
   const { expState: heartTreeExpState, updateExpState: updateHeartTreeExpState } = useHeartTreeExp();
   const { unlockAchievement } = useAchievements();

3. 第512行左右：修改 handleSpiritClick
   await addUserExp(spiritExp);

4. 第668-671行：修改成就经验
   await addUserExp(totalExpToAdd);

5. 第965-1002行：修改 updateUserExp 函数
   重命名为 updateUserExpFromSession
   使用 await updateUserExp(newTotalExp);

6. 第1391-1394行：修改成就解锁经验
   await addUserExp(totalExpToAdd);
   并添加：await unlockAchievement(achievement.id, achievement.category);

7. 第1442行：修改用户经验读取
   删除 const userExp = parseFloat(localStorage.getItem('userExp') || '0');
   直接使用 Hook 的 userExp

同样的修改也需要应用到：
- src/pages/dashboard/index.mobile.tsx
*/

