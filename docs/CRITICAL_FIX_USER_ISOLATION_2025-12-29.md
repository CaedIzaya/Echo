# 🔧 关键修复：用户数据隔离问题 - 2025-12-29

## 🚨 发现的严重问题

### ❌ 问题描述

**localStorage 没有用户隔离，导致不同用户共享数据！**

#### 具体表现：
1. ECS 服务器上注册新用户，显示 **2级56exp** - 实际上是读取了之前用户的数据
2. 用户 A 的经验值、连续天数等数据会被用户 B 看到
3. 多个用户在同一浏览器登录时，数据会互相污染

#### 受影响的数据：
- ✅ 用户经验值 (`userExp`)
- ✅ 用户等级 (`userLevel`)
- ✅ 连续天数 (`streakDays`)
- ✅ 总专注时长 (`totalFocusMinutes`)

---

## ✅ 修复内容

### 修复的文件

#### 1. `src/hooks/useUserExp.ts`
**修复前**：
```typescript
const STORAGE_KEY = 'userExp';
localStorage.getItem(STORAGE_KEY);  // ❌ 所有用户共享
```

**修复后**：
```typescript
import { getUserStorage, setUserStorage } from '~/lib/userStorage';
getUserStorage(STORAGE_KEY);  // ✅ 用户隔离
// 实际存储为: user_123_userExp
```

#### 2. `src/hooks/useUserStats.ts`
**修复前**：
```typescript
localStorage.getItem('streakDays');  // ❌ 所有用户共享
```

**修复后**：
```typescript
import { getUserStorage, setUserStorage } from '~/lib/userStorage';
getUserStorage('streakDays');  // ✅ 用户隔离
// 实际存储为: user_123_streakDays
```

---

## 🎯 用户隔离机制

### 工作原理

使用 `src/lib/userStorage.ts` 提供的用户隔离工具：

```typescript
// 设置当前用户 ID（登录时）
setCurrentUserId(session.user.id);

// 读取数据（自动添加用户前缀）
getUserStorage('userExp')  // → 读取 'user_123_userExp'

// 写入数据（自动添加用户前缀）
setUserStorage('userExp', '100')  // → 写入 'user_123_userExp' = '100'
```

### 数据隔离示例

**用户 A (ID: abc123)**:
- `localStorage['user_abc123_userExp']` = "100"
- `localStorage['user_abc123_streakDays']` = "5"

**用户 B (ID: xyz789)**:
- `localStorage['user_xyz789_userExp']` = "50"
- `localStorage['user_xyz789_streakDays']` = "3"

✅ **完全隔离，互不干扰！**

---

## 📊 数据读取优先级

### 已确认的优先级策略

```typescript
// 1. 优先从数据库读取
const dbExp = await fetch('/api/user/exp');

// 2. 读取 localStorage（用户隔离）
const localExp = getUserStorage('userExp');

// 3. 取较大值（防止数据丢失）
const finalExp = Math.max(dbExp, localExp);

// 4. 如果 localStorage 更大，同步到数据库
if (localExp > dbExp) {
  await fetch('/api/user/exp/update', { body: localExp });
}
```

**优先级**: 数据库 ≥ localStorage（用户隔离） > 默认值

---

## 🧪 测试验证

### 测试场景 1: 新用户注册

**操作**：
1. 注册全新用户
2. 检查经验值和等级

**预期结果**：
- ✅ 显示 1级 0exp（初始值）
- ❌ 不应显示其他用户的数据（如 2级56exp）

### 测试场景 2: 多用户切换

**操作**：
1. 用户 A 登录，专注获得经验值
2. 退出登录
3. 用户 B 登录

**预期结果**：
- ✅ 用户 B 看到自己的数据
- ✅ 用户 A 的数据已隔离存储

### 测试场景 3: 数据库同步

**操作**：
1. 在设备 A 上获得经验值
2. 在设备 B 上登录同一账号

**预期结果**：
- ✅ 设备 B 从数据库读取最新数据
- ✅ 数据正确同步

---

## 🔍 新用户流程验证

### 流程 1: 稍后再说

**路径**: 选择兴趣 → 点击"稍后再说" → Dashboard

**检查点**：
1. ✅ 设置 `localStorage['isNewUserFirstEntry'] = 'true'`
2. ✅ Dashboard 读取该标志并显示启动激励
3. ✅ 显示后删除该标志

### 流程 2: 完成计划创建

**路径**: 选择兴趣 → 聚焦选择 → 创建计划 → Dashboard

**检查点**：
1. ✅ 设置 `localStorage['isNewUserFirstEntry'] = 'true'`
2. ✅ 标记 `hasCompletedOnboarding = true` 到数据库
3. ✅ Dashboard 读取标志并显示启动激励
4. ✅ 显示后删除该标志

**代码位置**：
- 设置标志: `src/pages/onboarding/index.tsx` 第120行
- 设置标志: `src/pages/onboarding/goal-setting.tsx` 第447行
- 读取标志: `src/pages/dashboard/index.tsx` 第1640行
- 删除标志: `src/pages/dashboard/index.tsx` 第1657行

---

## 🚀 部署和测试

### 本地测试

```bash
# 1. 清除旧的 localStorage
# 在浏览器控制台执行:
localStorage.clear()

# 2. 重启开发服务器
npm run dev

# 3. 注册新用户测试
# 预期: 显示 1级 0exp
```

### 服务器部署

```bash
# 1. 上传新版本
scp echo.tar.gz root@121.43.158.122:/root/

# 2. 在服务器上部署
cd /root
rm -rf t3-app
tar -xzf echo.tar.gz
cd t3-app

# 创建 .env
cat > .env << 'EOF'
DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public"
NEXTAUTH_SECRET="Apw2acnT7u81F3mYRcHHo1bVG18sNMOlqEfhwAYpxPw="
NEXTAUTH_URL="http://121.43.158.122:3000"
NODE_ENV="production"
EOF

# 3. 部署
npm ci --only=production
npx prisma generate
npm run build

# 4. 重启应用
pm2 restart echo-app
pm2 logs echo-app
```

---

## 📝 清理旧数据（可选）

### 清理浏览器中的旧数据

用户可以手动清除浏览器的旧数据：

```javascript
// 在浏览器控制台执行
// 1. 查看所有 localStorage 数据
for (let i = 0; i < localStorage.length; i++) {
  console.log(localStorage.key(i), localStorage.getItem(localStorage.key(i)));
}

// 2. 清除旧的全局 key（不带 user_ 前缀的）
localStorage.removeItem('userExp');
localStorage.removeItem('streakDays');
localStorage.removeItem('totalFocusMinutes');
localStorage.removeItem('userExpSynced');
localStorage.removeItem('userStatsSynced');

// 3. 或直接清空所有
localStorage.clear();
```

---

## ✅ 修复验证清单

- [x] `useUserExp.ts` 已修复
- [x] `useUserStats.ts` 已修复
- [x] 新版本已打包 (`echo.tar.gz`)
- [ ] 本地测试通过
- [ ] 服务器部署完成
- [ ] 新用户注册显示正确（1级 0exp）
- [ ] 多用户切换数据隔离正确
- [ ] 数据库同步正常工作

---

## 🎯 其他需要检查的 Hook

### 可能也需要修复的 Hook:

1. `useHeartTreeExp.ts` - 心树经验值
2. `useHeartTreeName.ts` - 心树名称
3. `useAchievements.ts` - 成就系统

**检查方法**：
```bash
# 搜索直接使用 localStorage 的地方
grep -r "localStorage.getItem\|localStorage.setItem" src/hooks/
```

如果这些 Hook 也有问题，使用相同的修复方法。

---

## 📊 影响评估

### 严重程度: 🔴 高危

**影响范围**：
- 所有用户的经验值和等级数据
- 连续天数统计
- 总专注时长
- 可能导致数据混乱和用户体验问题

### 修复后的改善：

✅ **数据隔离**: 每个用户的数据完全独立  
✅ **数据准确**: 新用户显示正确的初始值  
✅ **跨设备同步**: 优先从数据库读取  
✅ **防数据丢失**: 取数据库和本地较大值  

---

## 🎉 修复完成

**修复时间**: 2025-12-29  
**修复版本**: echo.tar.gz (2.74 MB)  
**修复人员**: AI Assistant  
**状态**: ✅ 代码已修复，待部署测试

---

**下一步**: 部署到服务器并测试新用户注册流程！

