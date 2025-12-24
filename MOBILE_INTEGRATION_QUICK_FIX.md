# 📱 Mobile Dashboard 快速修复

## 已完成 ✅
- ✅ Hooks 已导入（第17-19行）
- ✅ Hooks 已声明（第266-268行）
- ✅ 用户等级自动同步（第414-420行）
- ✅ 所有 `parseFloat(localStorage.getItem('userExp'))` 已替换为 `userExp`

## 剩余工作 ⚠️

需要替换 6 处 `localStorage.setItem('userExp')` 操作。

---

## 🔄 需要替换的位置

### 1. 行553：批量完成小目标
**查找**：
```typescript
const totalExp = currentExp + (milestoneExp * milestoneIds.length);
localStorage.setItem('userExp', totalExp.toString());
```

**替换为**：
```typescript
const totalExpToAdd = milestoneExp * milestoneIds.length;
await addUserExp(totalExpToAdd);
```

### 2. 行862：updateUserExp 函数
**查找**：
```typescript
// 保存经验值
localStorage.setItem('userExp', newTotalExp.toString());
```

**替换为**：
```typescript
// 保存经验值到数据库 + localStorage
await updateUserExp(newTotalExp);
```

同时将函数改为 async：
```typescript
const updateUserExp = async (minutes: number, ...) => {
```

### 3. 行1052：每日登录奖励
**查找**：
```typescript
const newExp = currentExp + loginExp;
localStorage.setItem('userExp', newExp.toString());
```

**替换为**：
```typescript
await addUserExp(loginExp);
```

### 4. 行1206：成就解锁经验
**查找**：
```typescript
const totalExp = currentExp + (achievementExp * allNew.length);
localStorage.setItem('userExp', totalExp.toString());
```

**替换为**：
```typescript
const totalExpToAdd = achievementExp * allNew.length;
await addUserExp(totalExpToAdd);

// 同步成就到数据库
for (const achievement of allNew) {
  await unlockAchievementToDB(achievement.id, achievement.category);
}
```

### 5. 行1785：小精灵点击（第1处）
**查找**：
```typescript
const newExp = currentExp + spiritExp;
localStorage.setItem('userExp', newExp.toString());
```

**替换为**：
```typescript
await addUserExp(spiritExp);
```

### 6. 行2033：小精灵点击（第2处）
**查找**：
```typescript
const newExp = currentExp + spiritExp;
localStorage.setItem('userExp', newExp.toString());
```

**替换为**：
```typescript
await addUserExp(spiritExp);
```

---

## ⚡ VS Code 快速替换

打开 `src/pages/dashboard/index.mobile.tsx`，按 `Ctrl+H`：

### 替换1：删除变量声明
**查找**（正则）：
```regex
const currentExp = userExp;\s*\n\s*const newExp = currentExp \+ (\w+);\s*\n\s*localStorage\.setItem\('userExp', newExp\.toString\(\)\);
```

**替换为**：
```
await addUserExp($1);
```

### 替换2：删除 totalExp 声明
**查找**（正则）：
```regex
const totalExp = currentExp \+ (.+?);\s*\n\s*localStorage\.setItem\('userExp', totalExp\.toString\(\)\);
```

**替换为**：
```
const totalExpToAdd = $1;
await addUserExp(totalExpToAdd);
```

---

## 🎯 修改后需要做的

### 1. 添加 async 关键字
确保包含 `await addUserExp()` 的函数都是 async 的：
- `updateUserExp` → `updateUserExpFromSession` (async)
- 小精灵点击的 onClick handler → async
- setTimeout 回调 → async

### 2. 测试
```bash
npm run dev
```

测试：
- 完成专注 → 经验增加
- 解锁成就 → 成就保存到数据库
- 小精灵点击 → 经验增加

---

## 📊 预期结果

修改完成后：
- ✅ 所有经验值操作都保存到数据库
- ✅ 换设备登录数据同步
- ✅ 清除浏览器数据不丢失

---

**使用 VS Code 的搜索替换功能，5分钟完成！** 🚀














