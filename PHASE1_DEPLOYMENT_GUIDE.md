# 🚀 Phase 1 修复部署指南

## ✅ 已完成的工作

### 1️⃣ 数据库结构更新
已在 `User` 表添加以下字段：
- `userExp` - 用户经验值
- `userLevel` - 用户等级
- `heartTreeLevel` - 心树等级
- `heartTreeCurrentExp` - 心树当前经验
- `heartTreeTotalExp` - 心树总经验
- `lastWateredDate` - 最后浇水日期
- `fertilizerExpiresAt` - 施肥过期时间
- `fertilizerMultiplier` - 施肥倍率

已创建 `Achievement` 表：
- `id` - 主键
- `userId` - 用户ID
- `achievementId` - 成就ID
- `category` - 成就类别
- `unlockedAt` - 解锁时间

### 2️⃣ API 接口（6个）
**用户经验**:
- ✅ `GET /api/user/exp` - 获取用户经验
- ✅ `POST /api/user/exp/update` - 更新用户经验

**心树经验**:
- ✅ `GET /api/heart-tree/exp` - 获取心树经验
- ✅ `POST /api/heart-tree/exp/update` - 更新心树经验

**成就**:
- ✅ `GET /api/achievements` - 获取成就列表
- ✅ `POST /api/achievements/unlock` - 解锁成就

### 3️⃣ 前端 Hooks（3个）
- ✅ `useUserExp` - 用户经验管理
- ✅ `useHeartTreeExp` - 心树经验管理
- ✅ `useAchievements` - 成就管理

---

## 🎯 部署步骤

### 第1步：应用数据库迁移 ⚠️ 重要

```bash
cd c:\Users\ASUS\Desktop\t3-app
npm run db:push
```

**这会做什么**：
- 添加用户经验、心树经验字段到 User 表
- 创建 Achievement 表
- 不影响现有数据
- 所有新字段都有默认值

**预期输出**：
```
✔ Generated Prisma Client
...
✔ Database synchronized with Prisma schema.
```

### 第2步：验证数据库

```bash
# 打开 Prisma Studio 检查
npx prisma studio
```

检查项：
- ✅ User 表有新字段（userExp, userLevel 等）
- ✅ Achievement 表已创建
- ✅ 现有用户数据完好

### 第3步：测试 API（本地）

```bash
# 启动开发服务器
npm run dev
```

使用 Postman 或浏览器测试：

#### 测试1：获取用户经验
```http
GET http://localhost:3000/api/user/exp
```

预期响应：
```json
{
  "userExp": 0,
  "userLevel": 1
}
```

#### 测试2：更新用户经验
```http
POST http://localhost:3000/api/user/exp/update
Content-Type: application/json

{
  "userExp": 100
}
```

预期响应：
```json
{
  "success": true,
  "userExp": 100,
  "userLevel": 2
}
```

#### 测试3：解锁成就
```http
POST http://localhost:3000/api/achievements/unlock
Content-Type: application/json

{
  "achievementId": "first_focus",
  "category": "first"
}
```

预期响应：
```json
{
  "success": true,
  "alreadyUnlocked": false,
  "achievement": {
    "id": "first_focus",
    "category": "first",
    "unlockedAt": "2024-12-16T..."
  }
}
```

### 第4步：推送到生产环境

```bash
git add .
git commit -m "feat: Phase1数据持久化 - 用户经验/心树经验/成就系统"
git push origin main
```

**Vercel 会自动**：
1. 检测代码变更
2. 构建应用
3. 部署到生产环境
4. 大约 3-5 分钟完成

### 第5步：生产环境数据库迁移

在 Vercel 部署完成后：

```bash
# 方法1：使用 Vercel CLI
vercel env pull
npm run db:push

# 方法2：在 Vercel 项目设置中
# Settings → General → Build & Development Settings
# 添加 Build Command: prisma generate && prisma db push && next build
```

---

## 📝 下一步：集成到现有组件

### 更新 Dashboard 组件

现在需要将旧的 localStorage 逻辑替换为新的 Hooks。

#### 文件：`src/pages/dashboard/index.tsx`

**旧代码（localStorage）**：
```typescript
const updateUserExp = (minutes: number, rating?: number) => {
  const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
  const newExp = currentExp + calculateExp(minutes, rating);
  localStorage.setItem('userExp', newExp.toString());
};
```

**新代码（使用 Hook）**：
```typescript
import { useUserExp } from '~/hooks/useUserExp';

function Dashboard() {
  const { userExp, userLevel, addUserExp } = useUserExp();
  
  const updateUserExp = async (minutes: number, rating?: number) => {
    const expToAdd = calculateExp(minutes, rating);
    await addUserExp(expToAdd);
  };
}
```

#### 文件：`src/lib/AchievementSystem.tsx`

**旧代码**：
```typescript
private saveAchievedAchievements() {
  localStorage.setItem('achievedAchievements', JSON.stringify(Array.from(this.achievedAchievements)));
}
```

**新代码**：
```typescript
import { useAchievements } from '~/hooks/useAchievements';

// 在组件中使用
const { unlockAchievement } = useAchievements();

// 解锁成就时
await unlockAchievement('flow_master', 'flow');
```

#### 文件：`src/lib/HeartTreeExpSystem.ts`

**旧代码**：
```typescript
export function saveHeartTreeExpState(state: HeartTreeExpState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}
```

**新代码**：
```typescript
import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';

// 在组件中使用
const { expState, updateExpState } = useHeartTreeExp();

// 更新经验时
await updateExpState(newState);
```

---

## 🔍 数据迁移机制

### 自动迁移

Hooks 会自动处理数据迁移：

```
用户首次登录（部署后）：
1. Hook 检测到未同步标记
2. 读取 localStorage 中的旧数据
3. 自动同步到数据库
4. 标记已同步

用户再次登录：
1. Hook 检测到已同步标记
2. 从数据库加载最新数据
3. 缓存到 localStorage
```

### 手动触发同步（可选）

如果需要手动触发同步：

```typescript
const { syncToDatabase: syncUserExp } = useUserExp();
const { syncToDatabase: syncHeartTreeExp } = useHeartTreeExp();
const { syncToDatabase: syncAchievements } = useAchievements();

// 触发全部同步
await Promise.all([
  syncUserExp(),
  syncHeartTreeExp(),
  syncAchievements(),
]);
```

---

## 📊 验证部署

### 1. 检查数据库

在 Vercel Dashboard：
1. 进入 Storage → Postgres
2. 查看 User 表是否有新字段
3. 查看 Achievement 表是否创建成功

### 2. 测试新用户

```
1. 创建新账号
2. 获得经验 → 检查等级显示
3. 解锁成就 → 检查成就列表
4. 登出再登录 → 验证数据保留
5. 换设备登录 → 验证数据同步
```

### 3. 测试老用户

```
1. 使用现有账号登录
2. Hook 自动迁移 localStorage 数据到数据库
3. 刷新页面 → 数据依然保留
4. 换设备登录 → 数据自动同步
```

### 4. 查看日志

在 Vercel 控制台查看日志：

```
# 成功日志示例
[useUserExp] 从数据库加载经验: 1250 等级: 13
[user-exp] 更新用户经验: userId=xxx, exp=1250, level=13
[useAchievements] 从数据库加载成就: 15 个
[achievements] 成就解锁成功: flow_master
```

---

## 🎯 成功指标

部署成功的标志：

- ✅ 数据库迁移成功（新字段和表已创建）
- ✅ API 接口正常响应
- ✅ 新用户数据保存到数据库
- ✅ 老用户数据自动迁移
- ✅ 换设备登录数据同步
- ✅ 清除浏览器数据不丢失

---

## 🐛 故障排查

### 问题1：数据库迁移失败

**症状**：`npm run db:push` 报错

**解决**：
```bash
# 检查 DATABASE_URL
echo $DATABASE_URL

# 重新生成 Prisma Client
npx prisma generate

# 再次尝试
npm run db:push
```

### 问题2：API 返回 500 错误

**症状**：调用 API 返回服务器错误

**解决**：
1. 检查日志：`vercel logs --follow`
2. 验证数据库连接
3. 检查 Prisma Client 是否生成

### 问题3：数据没有同步

**症状**：换设备登录数据丢失

**解决**：
1. 检查用户是否已登录
2. 查看浏览器控制台日志
3. 验证 API 调用是否成功
4. 手动触发同步：`syncToDatabase()`

---

## 📈 监控建议

### 关键指标

1. **API 成功率**：应 > 99%
2. **数据同步成功率**：应 > 95%
3. **数据库查询时间**：应 < 500ms
4. **用户投诉数**：应 = 0

### 日志监控

重点关注：
- `[user-exp]` - 用户经验相关
- `[heart-tree-exp]` - 心树经验相关
- `[achievements]` - 成就相关
- 错误日志

---

## ✨ 预期效果

### Before（修复前）
```
用户换设备：
❌ 等级从 Lv.10 → Lv.1
❌ 成就全部消失
❌ 心树从 Lv.8 → Lv.1
```

### After（修复后）
```
用户换设备：
✅ 等级依然是 Lv.10
✅ 成就完整保留
✅ 心树依然是 Lv.8
✅ 数据自动同步
```

---

## 🎉 下一步

Phase 1 完成后：
1. 监控一周，收集反馈
2. 确认无问题后进行 Phase 2
3. 逐步优化性能
4. 添加更多监控指标

---

**部署完成时间预估**: 15-20 分钟  
**用户影响**: 无（完全向后兼容）  
**数据安全**: 高（双重保存 + 自动迁移）

**状态**: ✅ 准备部署



