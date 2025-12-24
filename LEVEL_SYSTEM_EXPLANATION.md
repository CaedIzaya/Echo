# 等级系统详细说明

## 📊 经验值存储方式

### 1. **存储位置**
```
数据库 (PostgreSQL)
  ├── User.userExp (Float, default: 0)
  └── User.userLevel (Int, default: 1)

localStorage
  ├── 'userExp' - 用户经验值字符串
  └── 'userExpSynced' - 是否已同步标记
```

### 2. **等级计算公式**

**当前系统：累计经验值 → 等级**

```typescript
// 每个等级所需经验值（到达下一级需要的经验）
Level 1  → Level 2  : 100 EXP
Level 2  → Level 3  : 100 EXP
Level 3  → Level 4  : 100 EXP
...
Level 10 → Level 11 : 100 EXP（新手阶段，每级100）

Level 11 → Level 12 : 200 EXP
...
Level 20 → Level 21 : 200 EXP（进阶阶段，每级200）

Level 21 → Level 30 : 300 EXP（熟练阶段，每级300）
Level 31 → Level 40 : 400 EXP（专家阶段，每级400）
Level 41 → Level 50 : 500 EXP（大师阶段，每级500）
Level 51 → Level 60 : 600 EXP（宗师阶段，每级600）
Level 61+         : 1000 EXP（传奇阶段，每级1000）
```

### 3. **1001 经验值 = 多少级？**

让我们计算一下：

```
Level 1-10 (新手)：10级 × 100 EXP = 1000 EXP
Level 11：还剩 1 EXP，不足200，所以卡在 Level 11

✅ 正确答案：1001 EXP = Level 11（不是Level 10！）
```

**完整对照表：**
```
经验值累计    当前等级    还需经验到下一级
-----------------------------------------
0-99       →  Level 1   (需 100 到 Level 2)
100-199    →  Level 2   (需 100 到 Level 3)
...
900-999    →  Level 10  (需 100 到 Level 11)
1000-1199  →  Level 11  (需 200 到 Level 12) ← 你的1001在这里！
1200-1399  →  Level 12  (需 200 到 Level 13)
```

## 🔍 等级计算代码

```typescript
// src/lib/LevelSystem.tsx:107-135
static calculateLevel(exp: number): UserLevel {
  let totalExp = exp;
  let currentLevel = 1;
  let currentExp = 0;
  
  // 计算当前等级
  let expNeeded = this.getExpRequiredForLevel(1);
  while (totalExp >= expNeeded && currentLevel < 99) {
    totalExp -= expNeeded;  // 减去这一级所需经验
    currentLevel++;         // 升级
    expNeeded = this.getExpRequiredForLevel(currentLevel); // 获取下一级所需
  }
  currentExp = Math.floor(totalExp); // 当前等级剩余经验
  
  const nextLevelExp = this.getExpRequiredForLevel(currentLevel);
  const progress = Math.floor((currentExp / nextLevelExp) * 100);
  
  return {
    currentLevel,
    currentExp,
    totalExp: exp,
    title: this.getLevelTitle(currentLevel),
    nextLevelExp,
    progress,
    cycle: Math.floor((currentLevel - 1) / 60),
    unlockedFeatures: []
  };
}
```

## ⚠️ 你遇到的问题：经验值每日被重置

### 问题根源

**检查点 1：每日刷新时的代码（Dashboard index.tsx:843-877）**

```typescript
// 处理新的一天：归档昨日数据并重置今日数据
if (isNewDay) {
  // ✅ 归档昨日数据
  updateStats({ yesterdayMinutes });
  
  // ✅ 更新连续天数
  updateStats({ streakDays: newStreakDays });
  
  // ✅ 保存今日日期标记
  localStorage.setItem('lastFocusDate', today);
  
  // ⚠️ 重置今日数据（从0开始）
  saveTodayStats(0);
  setTodayStats({ minutes: 0, date: today });
}
```

**结论：这段代码只重置 todayStats，不应该影响 userExp！**

### 🎯 真正的问题可能在这里！

**检查点 2：useUserExp Hook 的加载逻辑**

```typescript
// src/hooks/useUserExp.ts:56-89
useEffect(() => {
  if (status === 'loading') return;

  if (status === 'authenticated') {
    const synced = localStorage.getItem(SYNC_KEY);
    
    if (!synced) {
      // ❌ 未同步：从数据库加载
      // 问题：如果数据库是0，会覆盖localStorage！
      loadFromDatabase();
    } else {
      // ✅ 已同步：先用localStorage，后台同步
      const localExp = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');
      if (localExp > 0) {
        setUserExp(localExp);
      }
      setIsLoading(false);
      
      // 后台同步数据库（确保最新）
      loadFromDatabase(); // ❌ 这里也会从数据库读取！
    }
  }
}, [status, loadFromDatabase]);
```

**问题机制：**
```
昨天：
1. 你专注获得了100 EXP
2. localStorage: userExp = 100
3. 数据库保存：❌ 失败（网络问题/API错误）

今天（新的一天）：
1. 页面刷新/重新登录
2. useUserExp Hook 运行
3. loadFromDatabase() 从数据库读取
4. 数据库返回：userExp = 0 (因为昨天没保存成功)
5. ❌ localStorage 被覆盖为 0
```

## 🔧 紧急修复方案

### 方案 1：修改 useUserExp Hook - 防止数据库覆盖

```typescript
// src/hooks/useUserExp.ts 的 loadFromDatabase 函数
const loadFromDatabase = useCallback(async () => {
  if (!session?.user?.id) return;

  try {
    const response = await fetch('/api/user/exp');
    if (response.ok) {
      const data = await response.json();
      const dbExp = data.userExp || 0;
      const dbLevel = data.userLevel || 1;
      
      // 🔥 新增：对比 localStorage 和数据库的值
      const localExp = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');
      
      console.log('[useUserExp] 数据对比', {
        dbExp,
        localExp,
        willUse: localExp > dbExp ? 'localStorage' : 'database'
      });
      
      // ✅ 如果 localStorage 的值大于数据库，说明数据库数据过期
      if (localExp > dbExp) {
        console.warn('[useUserExp] ⚠️ 检测到数据不一致！localStorage经验值高于数据库，使用localStorage并同步到数据库');
        setUserExp(localExp);
        const levelInfo = LevelManager.calculateLevel(localExp);
        setUserLevel(levelInfo.currentLevel);
        localStorage.setItem(STORAGE_KEY, localExp.toString());
        
        // 自动同步到数据库
        const syncResponse = await fetch('/api/user/exp/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userExp: localExp }),
        });
        
        if (syncResponse.ok) {
          console.log('[useUserExp] ✅ 数据已修复并同步到数据库');
          localStorage.setItem(SYNC_KEY, 'true');
        }
      } else {
        // 数据库的值 >= localStorage，使用数据库的值
        setUserExp(dbExp);
        setUserLevel(dbLevel);
        localStorage.setItem(STORAGE_KEY, dbExp.toString());
        localStorage.setItem(SYNC_KEY, 'true');
        console.log('[useUserExp] ✅ 从数据库加载经验:', dbExp, '等级:', dbLevel);
      }
    }
  } catch (error) {
    console.error('[useUserExp] 加载失败，使用本地数据:', error);
    const localExp = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');
    if (localExp > 0) {
      setUserExp(localExp);
      const levelInfo = LevelManager.calculateLevel(localExp);
      setUserLevel(levelInfo.currentLevel);
    }
  } finally {
    setIsLoading(false);
  }
}, [session?.user?.id]);
```

### 方案 2：增加日志追踪

在 Dashboard 的每日刷新逻辑中添加日志：

```typescript
if (isNewDay) {
  // 🔥 添加：记录经验值状态
  const beforeUserExp = localStorage.getItem('userExp');
  console.log('📅 新的一天开始 - 经验值状态', {
    date: today,
    userExp: beforeUserExp,
    todayMinutes: yesterdayMinutes
  });
  
  // ... 原有代码 ...
  
  // 🔥 添加：确认经验值没有被修改
  const afterUserExp = localStorage.getItem('userExp');
  if (beforeUserExp !== afterUserExp) {
    console.error('❌ 警告：经验值在日期切换时被意外修改！', {
      before: beforeUserExp,
      after: afterUserExp
    });
  }
}
```

## 🛡️ 临时恢复方案

如果你现在的经验值被重置了，可以手动恢复：

1. **打开浏览器控制台（F12）**
2. **执行以下代码**：

```javascript
// 设置你的正确经验值（例如1001）
const correctExp = 1001;

// 保存到 localStorage
localStorage.setItem('userExp', correctExp.toString());
localStorage.setItem('userExpSynced', 'false'); // 标记为未同步，强制下次从localStorage读取

// 同步到数据库
fetch('/api/user/exp/update', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userExp: correctExp })
})
.then(res => res.json())
.then(data => {
  console.log('✅ 经验值已恢复:', data);
  window.location.reload(); // 刷新页面
})
.catch(err => console.error('❌ 恢复失败:', err));
```

## 📌 总结

1. **1001 EXP = Level 11**（不是Level 10）
2. **经验值存储**：数据库 + localStorage 双重存储
3. **问题根源**：数据库值为0时覆盖了localStorage
4. **修复方案**：对比两者值，选择更大的那个
5. **每日刷新不影响经验值**：只重置todayStats，不影响userExp

请按照修复方案修改代码，或者先用临时恢复方案找回你的经验值！






