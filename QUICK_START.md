# ⚡ Phase 1 快速开始

## 🎯 当前状态

✅ **已完成**：
- 数据库结构（User 表新字段 + Achievement 表）
- 6个 API 接口
- 3个前端 Hooks
- 完整文档

⚠️ **待完成**：
- 应用数据库迁移
- 集成到 Dashboard 组件
- 测试验证

---

## 🚀 立即开始（3步）

### 第1步：应用数据库迁移 ✅

已解决数据库连接问题！现在运行：

```bash
npm run db:push
```

预期输出：
```
✔ Generated Prisma Client
...
✔ Database synchronized with Prisma schema.
```

### 第2步：集成到组件 📝

有**两种方式**可以选择：

#### 方式A：参考文档手动集成（推荐）

1. 打开 **`INTEGRATION_GUIDE.md`** - 详细集成指南
2. 打开 **`DASHBOARD_INTEGRATION_EXAMPLE.tsx`** - 代码示例
3. 按照指南修改 `src/pages/dashboard/index.tsx`

**关键修改点**：
- 导入 Hooks
- 在组件顶部声明 Hooks
- 替换所有 `localStorage.getItem('userExp')` 为 `userExp`
- 替换所有 `localStorage.setItem('userExp')` 为 `await addUserExp()`

#### 方式B：快速搜索替换

在 VS Code 中：

1. 打开 `src/pages/dashboard/index.tsx`
2. 按 `Ctrl+H` 打开搜索替换
3. 按照 `INTEGRATION_GUIDE.md` 中的"快速集成脚本"部分操作

### 第3步：测试验证 🧪

```bash
# 启动开发服务器
npm run dev

# 测试流程：
1. 登录账号
2. 完成一次专注 → 检查经验是否增加
3. 打开 Prisma Studio: npx prisma studio
4. 查看 User 表 → userExp 应该更新了
```

---

## 📁 文档导航

### 必读文档 ⭐
1. **`INTEGRATION_GUIDE.md`** - 详细的组件集成指南
2. **`DASHBOARD_INTEGRATION_EXAMPLE.tsx`** - 实际代码示例
3. **`PHASE1_DEPLOYMENT_GUIDE.md`** - 完整部署指南

### 参考文档
4. **`PHASE1_COMPLETE_SUMMARY.md`** - 完成总结
5. **`DATA_PERSISTENCE_AUDIT.md`** - 问题分析
6. **`DATA_FIX_PRIORITY.md`** - 优先级清单

---

## 🔍 集成检查清单

在 `src/pages/dashboard/index.tsx` 中：

- [ ] 导入了 `useUserExp`, `useHeartTreeExp`, `useAchievements`
- [ ] 在组件顶部声明了这3个 Hooks
- [ ] 添加了 `useEffect` 同步用户等级
- [ ] 修改了 `handleSpiritClick` 使用 `await addUserExp()`
- [ ] 修改了成就经验更新使用 `await addUserExp()`
- [ ] 修改了 `updateUserExp` 函数（重命名并使用 Hook）
- [ ] 修改了成就解锁添加 `await unlockAchievement()`
- [ ] 删除了所有 `localStorage.getItem('userExp')`

同样修改 `src/pages/dashboard/index.mobile.tsx`

---

## 🎯 集成示例（核心代码）

### 1. 导入 Hooks

```typescript
// 在 src/pages/dashboard/index.tsx 顶部添加
import { useUserExp } from '~/hooks/useUserExp';
import { useHeartTreeExp } from '~/hooks/useHeartTreeExp';
import { useAchievements } from '~/hooks/useAchievements';
```

### 2. 使用 Hooks

```typescript
export default function DashboardPage() {
  // 在所有 state 之前声明
  const { userExp, userLevel: hookUserLevel, addUserExp, updateUserExp } = useUserExp();
  const { expState, updateExpState } = useHeartTreeExp();
  const { unlockAchievement } = useAchievements();
  
  // 原有 state
  const [userLevel, setUserLevel] = useState<UserLevel>({...});
  
  // 同步等级
  useEffect(() => {
    if (hookUserLevel > 0) {
      setUserLevel(LevelManager.calculateLevel(userExp));
    }
  }, [hookUserLevel, userExp]);
  
  // ... 其他代码
}
```

### 3. 替换经验更新

**旧代码**（删除）：
```typescript
const currentExp = parseFloat(localStorage.getItem('userExp') || '0');
const newExp = currentExp + expToAdd;
localStorage.setItem('userExp', newExp.toString());
```

**新代码**：
```typescript
await addUserExp(expToAdd);
```

---

## ⚡ 快速测试

### 测试1：用户经验

```typescript
// 在 Dashboard 组件中添加临时按钮
<button onClick={async () => {
  await addUserExp(100);
  console.log('新经验:', userExp);
}}>
  测试经验 +100
</button>
```

打开浏览器控制台，点击按钮：
- ✅ 控制台显示新经验
- ✅ Prisma Studio 中 User 表更新
- ✅ 刷新页面数据保留

### 测试2：成就系统

```typescript
// 测试解锁成就
await unlockAchievement('first_focus', 'first');

// 检查 Prisma Studio 中 Achievement 表
// 应该有一条新记录
```

### 测试3：跨设备同步

1. 设备A：获得100经验
2. 设备B：登录同一账号
3. 验证：设备B显示100经验

---

## 🐛 常见问题

### Q1: Hook 报错 "Cannot read property"

**解决**：确保 Hooks 在组件函数内部声明，且在所有条件返回（`if (loading) return ...`）之前

### Q2: 经验值没有保存

**检查**：
1. 用户是否已登录？
2. 数据库迁移是否成功？
3. 是否使用了 `await`？

```typescript
// ❌ 错误：没有 await
addUserExp(100);

// ✅ 正确：使用 await
await addUserExp(100);
```

### Q3: 数据库连接错误

**解决**：检查 `.env` 文件，确保 `DATABASE_URL` 是 PostgreSQL：

```env
DATABASE_URL=postgresql://neondb_owner:...
```

---

## 📊 完成进度

- ✅ 数据库结构 - 100%
- ✅ API 接口 - 100%
- ✅ 前端 Hooks - 100%
- ✅ 文档 - 100%
- ⚠️ 组件集成 - 待完成（15-30分钟）
- ⚠️ 测试验证 - 待完成（10分钟）

**预计总耗时**：30-45分钟完成全部集成和测试

---

## 🎉 完成后

### 1. 提交代码

```bash
git add .
git commit -m "feat: Phase1数据持久化完成 - 用户经验/成就/心树经验"
git push origin main
```

### 2. 等待 Vercel 部署

访问 Vercel Dashboard 查看部署进度

### 3. 验证生产环境

- 登录生产环境
- 完成一次专注
- 换设备登录验证同步

---

## 💡 提示

1. **备份**：修改前备份 `src/pages/dashboard/index.tsx`
2. **逐步修改**：一次修改一个函数，测试后再继续
3. **查看日志**：浏览器控制台会显示 Hook 的日志
4. **使用 Prisma Studio**：`npx prisma studio` 实时查看数据库

---

## 📞 需要帮助？

- **集成指南**：`INTEGRATION_GUIDE.md`
- **代码示例**：`DASHBOARD_INTEGRATION_EXAMPLE.tsx`
- **部署指南**：`PHASE1_DEPLOYMENT_GUIDE.md`

---

**🚀 准备好了吗？从第1步开始！**

1. 运行 `npm run db:push`
2. 打开 `INTEGRATION_GUIDE.md`
3. 开始集成！

**预计30分钟完成全部工作！** 💪











