# 数据持久化问题诊断报告

## 🔍 问题总结

用户报告：
1. 重启开发服务器后，等级和经验被刷新（清零）
2. 每周专注时长也被刷新
3. 数据库错误：`The column 'User.flowMetrics' does not exist in the current database`

## ✅ 已解决的问题

### 1. 数据库Schema不同步
**问题**：数据库从SQLite切换到PostgreSQL，但迁移历史还是SQLite的，导致很多字段缺失

**解决方案**：
- 删除旧的SQLite迁移文件夹
- 运行 `npx prisma db push` 同步schema到PostgreSQL数据库
- `flowMetrics` 字段已成功添加到数据库

**命令**：
```bash
# 删除旧迁移
Remove-Item -Recurse -Force prisma\migrations

# 同步schema到数据库
npx prisma db push
```

## 📊 数据持久化架构

### 用户经验值 (userExp) 和等级 (userLevel)

#### 存储位置
1. **数据库** (PostgreSQL - 主存储)
   - 表：`User`
   - 字段：`userExp` (Float), `userLevel` (Int)

2. **localStorage** (浏览器缓存)
   - Key: `userExp`
   - Key: `userExpSynced` (同步标记)

#### 数据流
```
用户操作 → Hook (useUserExp)
  ↓
1. 立即更新 localStorage (快速响应)
  ↓
2. 调用 API: POST /api/user/exp/update
  ↓
3. 更新数据库 (持久化)
  ↓
4. 设置同步标记
```

#### 加载优先级
```
1. 检查 localStorage 是否已同步
2. 如果已同步 → 先显示本地数据，后台同步数据库
3. 如果未同步 → 从数据库加载
4. 如果数据库失败 → 使用 localStorage 数据
```

### 本周专注时长 (weeklyStats)

#### 存储位置
1. **localStorage ONLY** (不存储到数据库)
   - Key: `weeklyStats`
   - 格式: `{ totalMinutes: number, weekStart: string }`

#### 重置规则
- **每周一 00:00 重置为 0**
- 通过比较 `weekStart` 日期判断是否需要重置
- **这是正常行为，不是Bug**

#### 不受影响的数据
- ✅ `userExp` (用户经验) - 永久累计
- ✅ `userLevel` (用户等级) - 永久累计
- ✅ `totalFocusMinutes` (总专注时长) - 永久累计
- ❌ `weeklyStats.totalMinutes` (本周专注) - 每周重置

## 🐛 可能的数据丢失原因

### 1. 数据库未正确保存 ⚠️

**症状**：经验值在localStorage中存在，但数据库中为0

**原因**：
- API调用失败但未显示错误
- 数据库连接问题
- Schema不同步（已解决）

**检查方法**：
```javascript
// 在浏览器控制台运行
console.log('LocalStorage经验值:', localStorage.getItem('userExp'));
console.log('是否已同步:', localStorage.getItem('userExpSynced'));

// 检查数据库
fetch('/api/user/exp')
  .then(r => r.json())
  .then(data => console.log('数据库经验值:', data));
```

### 2. 浏览器数据清除

**原因**：
- 用户手动清除浏览器缓存
- 隐私模式
- 浏览器崩溃

**预防**：
- 数据已同时保存到数据库
- 重新登录时会从数据库恢复

### 3. 开发环境数据库重置

**原因**：
- Vercel/Neon数据库自动清理（免费计划）
- 开发时运行 `prisma migrate reset`
- 数据库连接更换

**解决方案**：
- 确保数据库不会被自动清理
- 生产环境使用付费数据库计划
- 定期备份重要数据

### 4. 每周重置误解 ⚠️

**重要**：只有 `weeklyStats` 会每周重置，其他数据不会！

```javascript
// 每周一00:00重置
weeklyStats: { totalMinutes: 0, weekStart: '2025-12-22' }

// 永久保留
userExp: 1500  // ✅ 不会重置
userLevel: 5   // ✅ 不会重置
totalFocusMinutes: 3000  // ✅ 不会重置
```

## 🔧 诊断步骤

### 步骤1：检查数据库连接
```bash
# 在项目根目录运行
npx prisma studio

# 打开后查看User表，检查userExp和userLevel字段
```

### 步骤2：检查API是否正常
```bash
# 在浏览器控制台或Postman测试
# 获取用户经验
GET http://localhost:3000/api/user/exp

# 更新用户经验（需要登录）
POST http://localhost:3000/api/user/exp/update
Content-Type: application/json
{
  "userExp": 100
}
```

### 步骤3：检查Hook是否被调用
在 `src/pages/dashboard/index.tsx` 或 `index.mobile.tsx` 中添加日志：
```typescript
// 在专注完成后的代码中
console.log('🎯 准备更新经验值:', totalExpToAdd);
const expResult = await addUserExp(totalExpToAdd);
console.log('🎯 经验值更新结果:', expResult);
```

### 步骤4：检查localStorage
```javascript
// 在浏览器控制台运行
Object.keys(localStorage).forEach(key => {
  if (key.includes('exp') || key.includes('Exp') || key.includes('Level')) {
    console.log(key, ':', localStorage.getItem(key));
  }
});
```

## 🛡️ 数据保护机制

### 已实现的保护
1. **双重存储**：localStorage + 数据库
2. **自动同步**：每次更新都会同步到数据库
3. **失败降级**：数据库失败时使用localStorage
4. **同步标记**：`userExpSynced` 确保数据一致性

### 建议改进
1. **添加数据恢复功能**：
   - 在dashboard显示"从数据库恢复数据"按钮
   - 检测localStorage和数据库数据不一致时提醒

2. **添加数据版本号**：
   - 检测数据结构变化
   - 自动迁移旧数据

3. **添加数据备份**：
   - 每天自动备份用户数据到API
   - 提供数据导出功能

## 📝 测试清单

- [ ] 数据库Schema已同步 (运行 `npx prisma db push`)
- [ ] 数据库连接正常 (运行 `npx prisma studio`)
- [ ] API可以正常调用 (测试 `/api/user/exp`)
- [ ] 经验值更新会同步到数据库
- [ ] 刷新页面后数据不丢失
- [ ] 每周一本周数据正确重置（不影响经验值）
- [ ] 重启服务器后数据不丢失
- [ ] 清除localStorage后可以从数据库恢复

## 🚀 立即行动

1. **重启开发服务器**：
```bash
npm run dev
```

2. **测试数据持久化**：
   - 登录应用
   - 完成一次专注（获得经验值）
   - 查看控制台日志确认API调用成功
   - 刷新页面，检查经验值是否保留
   - 清除localStorage，刷新页面，检查是否从数据库恢复

3. **如果数据仍然丢失**：
   - 打开浏览器开发者工具 → Network标签
   - 完成一次专注
   - 查看 `/api/user/exp/update` 请求是否成功
   - 检查响应内容是否正确
   - 截图并报告问题

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. 浏览器控制台的完整日志（包括错误信息）
2. Network标签中的API请求响应
3. `npx prisma studio` 中User表的数据截图
4. localStorage中的相关数据





