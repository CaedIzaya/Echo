# 🔧 组件集成指南

## 概述

本指南说明如何将新的 Hooks（`useUserExp`、`useHeartTreeExp`、`useAchievements`）集成到现有组件中。

---

## 📝 集成步骤

### 第1步：导入新的 Hooks

在 `src/pages/dashboard/index.tsx` 和 `src/pages/dashboard/index.mobile.tsx` 顶部添加：

```typescript
// 在现有 import 下方添加
import { useUserExp } from '~/hooks/useUserExp';
import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';
import { useAchievements } from '~/hooks/useAchievements';
```

### 第2步：在组件中使用 Hooks

在组件函数内部，**在所有其他 state 声明之前**添加：

```typescript
export default function DashboardPage() {
  // ========== 新增：使用持久化 Hooks ==========
  const { userExp, userLevel: hookUserLevel, addUserExp, updateUserExp } = useUserExp();
  const { expState: heartTreeExpState, updateExpState: updateHeartTreeExp } = useHeartTreeExp();
  const { unlockAchievement, isAchievementUnlocked } = useAchievements();
  
  // 原有的 state 声明
  const [userLevel, setUserLevel] = useState<UserLevel>({...});
  // ... 其他 state
```

### 第3步：同步用户等级

用 Hook 的等级更新本地 state：

```typescript
// 在 useEffect 中添加
useEffect(() => {
  if (hookUserLevel > 0) {
    const levelInfo = LevelManager.calculateLevel(userExp);
    setUserLevel(levelInfo);
  }
}, [hookUserLevel, userExp]);
```

---

## 🔄 替换模式

### 模式1：读取用户经验

**旧代码**：
```typescript
const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
```

**新代码**：
```typescript
// 直接使用 userExp（来自 Hook）
// userExp 已经是 number 类型
```

### 模式2：更新用户经验

**旧代码**：
```typescript
const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
const newExp = currentExp + expToAdd;
localStorage.setItem('userExp', newExp.toString());
setUserLevel(LevelManager.calculateLevel(newExp));
```

**新代码**：
```typescript
await addUserExp(expToAdd);
// userExp 和 userLevel 会自动更新
```

### 模式3：设置用户经验

**旧代码**：
```typescript
localStorage.setItem('userExp', totalExp.toString());
```

**新代码**：
```typescript
await updateUserExp(totalExp);
```

---

## 📍 需要修改的具体位置

### 文件：`src/pages/dashboard/index.tsx`

#### 1. 小精灵点击事件（行 512）

**旧代码**：
```typescript
const spiritExp = LevelManager.calculateSpiritInteractionExp();
const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
const newExp = currentExp + spiritExp;
localStorage.setItem('userExp', newExp.toString());
localStorage.setItem('lastSpiritInteractionDate', today);
setUserLevel(LevelManager.calculateLevel(newExp));
```

**新代码**：
```typescript
const spiritExp = LevelManager.calculateSpiritInteractionExp();
await addUserExp(spiritExp);
localStorage.setItem('lastSpiritInteractionDate', today);
// userLevel 会自动更新
```

#### 2. 完成专注后更新经验（行 668-671）

**旧代码**：
```typescript
const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
const achievementExp = LevelManager.calculateAchievementExp('common');
const totalExp = currentExp + (achievementExp * dailyAchievements.length);
localStorage.setItem('userExp', totalExp.toString());
```

**新代码**：
```typescript
const achievementExp = LevelManager.calculateAchievementExp('common');
const totalExpToAdd = achievementExp * dailyAchievements.length;
await addUserExp(totalExpToAdd);
```

#### 3. 通用经验更新函数（行 965-1002）

**旧代码**：
```typescript
const updateUserExp = (minutes: number, rating?: number, completed: boolean = true, plannedMinutes?: number) => {
  const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
  // ... 计算逻辑 ...
  localStorage.setItem('userExp', newTotalExp.toString());
};
```

**新代码**：
```typescript
const updateUserExpFromSession = async (minutes: number, rating?: number, completed: boolean = true, plannedMinutes?: number) => {
  // ... 计算逻辑保持不变 ...
  await updateUserExp(newTotalExp);
};
```

#### 4. 成就解锁后更新经验（行 1391-1394）

**旧代码**：
```typescript
const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
const achievementExp = LevelManager.calculateAchievementExp('common');
const totalExp = currentExp + (achievementExp * allNew.length);
localStorage.setItem('userExp', totalExp.toString());
```

**新代码**：
```typescript
const achievementExp = LevelManager.calculateAchievementExp('common');
const totalExpToAdd = achievementExp * allNew.length;
await addUserExp(totalExpToAdd);
```

#### 5. 渲染用户经验（行 1442）

**旧代码**：
```typescript
const userExp = parseFloat(localStorage.getItem('userExp') || '0');
const levelInfo = LevelManager.calculateLevel(userExp);
```

**新代码**：
```typescript
// 直接使用 Hook 的值
const levelInfo = LevelManager.calculateLevel(userExp);
// 或者直接使用 hookUserLevel（如果已经计算好）
```

---

## 🎯 成就系统集成

### 文件：`src/lib/AchievementSystem.tsx`

**说明**：成就系统目前使用 localStorage，需要保持兼容性，但在组件中使用时通过 Hook 同步。

**不需要修改** `AchievementSystem.tsx`，而是在 Dashboard 组件中：

#### 旧的成就解锁

```typescript
const allNew = [
  ...flowAchievements, 
  ...timeAchievements, 
  ...dailyAchievements, 
  ...milestoneAchievements
];

if (allNew.length > 0) {
  setNewAchievements(allNew);
  // ... 
}
```

#### 新增：同步到数据库

```typescript
const allNew = [
  ...flowAchievements, 
  ...timeAchievements, 
  ...dailyAchievements, 
  ...milestoneAchievements
];

if (allNew.length > 0) {
  setNewAchievements(allNew);
  
  // 新增：同步到数据库
  for (const achievement of allNew) {
    await unlockAchievement(achievement.id, achievement.category);
  }
}
```

---

## 🌳 心树经验集成

### 文件：`src/pages/dashboard/HeartTree.tsx`

心树组件已经使用 `loadHeartTreeExpState()` 和 `saveHeartTreeExpState()`。

#### 替换方式

**旧代码**：
```typescript
import { loadHeartTreeExpState, saveHeartTreeExpState } from '~/lib/HeartTreeExpSystem';

// 在组件中
const [expState, setExpState] = useState<HeartTreeExpState>(loadHeartTreeExpState());

// 更新时
const updatedExpState = waterTree(expState);
setExpState(updatedExpState);
saveHeartTreeExpState(updatedExpState); // 只保存到 localStorage
```

**新代码**：
```typescript
import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';
import { waterTree } from '~/lib/HeartTreeExpSystem';

// 在组件中
const { expState, updateExpState } = useHeartTreeExp();

// 更新时
const updatedExpState = waterTree(expState);
await updateExpState(updatedExpState); // 保存到 localStorage + 数据库
```

---

## 🔍 验证集成

### 1. 功能测试

```typescript
// 测试用户经验
console.log('当前经验:', userExp);
console.log('当前等级:', hookUserLevel);

// 测试添加经验
await addUserExp(100);
console.log('新经验:', userExp); // 应该增加 100

// 测试成就
await unlockAchievement('first_focus', 'first');
console.log('是否已解锁:', isAchievementUnlocked('first_focus'));
```

### 2. 数据库验证

完成一次专注后：
1. 打开 Prisma Studio：`npx prisma studio`
2. 查看 User 表，检查 `userExp` 和 `userLevel` 是否更新
3. 查看 Achievement 表，检查成就是否记录

### 3. 跨设备测试

1. 在设备A获得经验
2. 在设备B登录
3. 验证经验和等级是否同步

---

## 🐛 常见问题

### 问题1：Hook 报错 "Cannot read property of undefined"

**原因**：Hook 在组件加载前就被调用

**解决**：确保 Hook 在组件函数内部声明，且在所有条件返回之前

### 问题2：经验值没有保存到数据库

**原因**：用户未登录

**解决**：检查 `session?.user?.id` 是否存在

### 问题3：数据同步延迟

**原因**：数据库请求是异步的

**解决**：使用 `await` 等待请求完成，或使用 Hook 的 `isSaving` 状态

---

## 📦 完整示例

### Dashboard 组件集成示例

```typescript
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useUserExp } from '~/hooks/useUserExp';
import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';
import { useAchievements } from '~/hooks/useAchievements';
import { LevelManager } from '~/lib/LevelSystem';

export default function DashboardPage() {
  // 使用持久化 Hooks
  const { userExp, userLevel: hookUserLevel, addUserExp } = useUserExp();
  const { expState, updateExpState } = useHeartTreeExp();
  const { unlockAchievement } = useAchievements();
  
  // 本地 state
  const [userLevel, setUserLevel] = useState(LevelManager.calculateLevel(0));
  
  // 同步等级
  useEffect(() => {
    if (hookUserLevel > 0) {
      const levelInfo = LevelManager.calculateLevel(userExp);
      setUserLevel(levelInfo);
    }
  }, [hookUserLevel, userExp]);
  
  // 专注完成处理
  const handleFocusComplete = async (minutes: number, rating: number) => {
    // 1. 计算经验
    const baseExp = minutes * 2;
    const ratingBonus = rating > 80 ? 50 : 0;
    const totalExp = baseExp + ratingBonus;
    
    // 2. 添加经验
    await addUserExp(totalExp);
    
    // 3. 检查并解锁成就
    if (minutes >= 25) {
      await unlockAchievement('first_focus', 'first');
    }
    
    // 4. 更新心树经验
    const newHeartTreeState = gainHeartTreeExp(expState, 15);
    await updateExpState(newHeartTreeState);
    
    console.log('✅ 专注完成，经验已保存');
  };
  
  return (
    <div>
      <h1>等级: Lv.{userLevel.level}</h1>
      <p>经验: {userExp} / {userLevel.expToNext}</p>
      {/* 其他组件 */}
    </div>
  );
}
```

---

## ✅ 集成检查清单

完成集成后，检查以下项目：

- [ ] 导入了新的 Hooks
- [ ] Hook 在组件函数内声明
- [ ] 所有 `localStorage.getItem('userExp')` 替换为 `userExp`
- [ ] 所有 `localStorage.setItem('userExp')` 替换为 `updateUserExp()` 或 `addUserExp()`
- [ ] 成就解锁调用 `unlockAchievement()`
- [ ] 心树经验使用 `updateExpState()`
- [ ] 测试新用户注册流程
- [ ] 测试老用户数据迁移
- [ ] 测试跨设备同步
- [ ] 检查数据库记录

---

## 🚀 快速集成脚本

如果你想快速替换，可以使用以下搜索替换模式：

### 1. 读取经验值
**搜索**：`parseFloat\(localStorage\.getItem\('userExp'\) \|\| '0'\)`  
**替换**：`userExp`

### 2. 保存经验值（简单情况）
**搜索**：`localStorage\.setItem\('userExp', (\w+)\.toString\(\)\);`  
**替换**：`await updateUserExp($1);`

### 3. 增加经验值
**搜索**：
```typescript
const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
const newExp = currentExp + (\w+);
localStorage.setItem('userExp', newExp.toString());
```
**替换**：
```typescript
await addUserExp($1);
```

---

**完成集成后，你的应用将实现真正的数据持久化！** 🎉




