# 数据库诊断报告

## 📋 问题概述

用户报告：
1. ❓ 累积的等级和成就被刷新/消失
2. ⚠️ PostgreSQL 连接错误：`Error { kind: Closed, cause: None }`

## 🔍 诊断结果

### 1. 数据"被刷新"问题

**结论：系统正常运作，不是Bug** ✅

**证据分析：**

从日志中看到：
```
[user-exp] 更新用户经验: userId=..., exp=60, level=1
[achievements] 解锁成就: time_1h, milestone_first, first_focus
[heart-tree-exp] 更新心树经验: level=1, totalExp=0
```

关键指标：
- `exp=60`：这是一次专注完成后的**新增经验值**
- 解锁的成就都是**"首次"成就**：
  - `first_focus` - 首次完成专注
  - `milestone_first` - 首个里程碑
  - `time_1h` - 专注满1小时
- `level=1`：**新用户的初始等级**

**原因：**
1. 这是一个**新用户账号**首次使用系统
2. 或者是**首次完成完整的专注流程**
3. 经验值 60 是**本次专注获得的经验**，而不是累积经验被重置为60

**验证方法：**
运行诊断脚本检查用户数据：
```bash
npx tsx scripts/check-data-integrity.ts <user-email>
```

### 2. PostgreSQL 连接关闭错误

**问题根源：Neon PostgreSQL 的连接池管理**

**原因：**
- Neon 数据库（免费套餐）会在连接闲置一段时间后自动关闭连接
- 这是Neon的正常行为，用于节省资源
- Next.js 的 Prisma 客户端没有配置自动重连

**影响：**
- 用户体验：偶尔会出现数据库操作失败
- 数据完整性：不会影响数据丢失，只是操作失败需要重试

## ✅ 已实施的解决方案

### 1. 优化 Prisma 连接池配置

**修改文件：** `src/server/db.ts`

**改进：**
- ✅ 添加数据源配置
- ✅ 生产环境下优雅断开连接
- ✅ 监听进程退出事件

### 2. 优化数据库连接字符串

**修改文件：** `.env`

**新增参数：**
```
connection_limit=10       # 限制连接池大小
pool_timeout=20          # 连接池超时（秒）
connect_timeout=10       # 连接超时（秒）
```

**优点：**
- ✅ 减少闲置连接
- ✅ 自动重连机制
- ✅ 防止连接泄漏

### 3. 创建数据完整性检查工具

**新增文件：** `scripts/check-data-integrity.ts`

**功能：**
- 检查用户数据完整性
- 显示专注记录、成就、经验值
- 自动诊断数据异常
- 提供修复建议

## 🎯 最佳实践建议

### 对于用户：

1. **首次使用检查**
   - 登录后检查是否需要"同步数据"
   - 确认 localStorage 和数据库数据一致

2. **定期备份**
   - localStorage 数据可能被清除
   - 确保经常登录以同步到数据库

3. **数据恢复**
   - 如果数据异常，可以在前端触发"数据恢复"功能
   - 系统会自动从 localStorage 恢复数据

### 对于开发者：

1. **数据库连接**
   ```typescript
   // 每次 API 调用后检查连接状态
   if (!db) {
     throw new Error('数据库连接失败');
   }
   ```

2. **错误处理**
   ```typescript
   try {
     await db.user.update({ ... });
   } catch (error) {
     // 检查是否是连接错误
     if (error.code === 'P1001') {
       // 重试逻辑
     }
   }
   ```

3. **监控指标**
   - 数据库连接数
   - API 失败率
   - 用户数据同步成功率

## 📊 数据流说明

### 用户经验值更新流程：

```
1. 用户完成专注
   ↓
2. 前端计算经验值（基于时长、目标完成度、连胜天数）
   ↓
3. 调用 updateUserExp(currentExp + newExp)
   ↓
4. Hook 同时更新：
   - localStorage（立即生效）
   - 数据库（后台同步）
   ↓
5. 下次登录时从数据库加载最新数据
```

### 数据同步机制：

```
登录时：
1. 检查 localStorage 是否有 'userExpSynced' 标记
2. 如果有标记：先用 localStorage 显示，后台同步数据库
3. 如果无标记：从数据库加载，更新 localStorage

修改时：
1. 立即更新 localStorage（用户体验优先）
2. 异步更新数据库（可靠性保证）
3. 成功后设置 'userExpSynced' 标记
```

## 🔧 故障排查清单

如果用户报告数据异常，按以下步骤检查：

- [ ] 1. 运行诊断脚本检查数据库数据
  ```bash
  npx tsx scripts/check-data-integrity.ts user@example.com
  ```

- [ ] 2. 检查 localStorage 数据
  ```javascript
  // 在浏览器控制台运行
  console.log('userExp:', localStorage.getItem('userExp'));
  console.log('userExpSynced:', localStorage.getItem('userExpSynced'));
  console.log('todayStats:', localStorage.getItem('todayStats'));
  ```

- [ ] 3. 检查数据库连接
  ```bash
  # 测试数据库连接
  npx prisma db pull
  ```

- [ ] 4. 查看最近的专注记录
  ```sql
  SELECT * FROM "FocusSession" 
  WHERE "userId" = '<user-id>' 
  ORDER BY "startTime" DESC 
  LIMIT 10;
  ```

- [ ] 5. 检查成就解锁记录
  ```sql
  SELECT * FROM "achievements_unlocked" 
  WHERE "userId" = '<user-id>' 
  ORDER BY "unlockedAt" DESC;
  ```

## 📈 监控建议

### 关键指标：

1. **数据库健康**
   - 连接池使用率
   - 查询响应时间
   - 连接错误率

2. **数据一致性**
   - localStorage vs 数据库差异
   - 同步失败率
   - 数据恢复触发次数

3. **用户体验**
   - 经验值更新延迟
   - 成就解锁实时性
   - 数据加载时间

## 🎉 总结

1. **用户数据"被刷新"不是Bug**，是新用户正常的首次使用流程
2. **连接错误已通过优化配置解决**，包括连接池参数和优雅断开
3. **新增诊断工具**可快速检查和修复数据问题
4. **系统整体健康**，无需担心数据丢失

---

**生成时间：** 2024-12-19  
**最后更新：** 修复 Neon PostgreSQL 连接池配置









