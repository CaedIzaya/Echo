# 🔍 数据持久化全面审计报告

## 📋 审计范围

检查所有可能"随风而逝"的用户数据，确保关键数据保存到数据库。

---

## 🚨 发现的问题

### ❌ 高危险：会丢失的关键数据

| 数据名称 | 当前存储 | 风险等级 | 换设备 | 清除浏览器 | 影响 |
|---------|---------|---------|--------|-----------|------|
| **用户经验值 (userExp)** | localStorage | 🔴 高 | ❌ 丢失 | ❌ 丢失 | 等级重置 |
| **成就列表 (achievedAchievements)** | localStorage | 🔴 高 | ❌ 丢失 | ❌ 丢失 | 成就全部消失 |
| **心树经验状态 (heartTreeExpState)** | localStorage | 🔴 高 | ❌ 丢失 | ❌ 丢失 | 心树等级重置 |
| **每日/每周统计 (todayStats/weeklyStats)** | localStorage | 🟡 中 | ❌ 丢失 | ❌ 丢失 | 历史数据丢失 |

### ✅ 已解决或合理的数据

| 数据名称 | 当前存储 | 状态 | 说明 |
|---------|---------|------|------|
| **心树名字 (heartTreeName)** | 数据库 | ✅ 已修复 | 刚刚修复完成 |
| **用户头像 (echo-avatar-v1)** | localStorage | ✅ 特批 | 图像数据，不适合数据库 |
| **专注会话 (FocusSession)** | 数据库 | ✅ 正常 | 已持久化 |
| **每日小结 (DailySummary)** | 数据库 | ✅ 正常 | 已持久化 |
| **周报 (WeeklyReport)** | 数据库 | ✅ 正常 | 已持久化 |
| **项目和里程碑 (Project/Milestone)** | 数据库 | ✅ 正常 | 已持久化 |

---

## 📊 数据丢失场景分析

### 场景 1：用户换设备登录
```
当前状态：
- ❌ 用户经验值从 Level 10 → Level 1
- ❌ 所有成就消失（20+ 个成就）
- ❌ 心树经验从 Lv.8 → Lv.1
- ✅ 专注历史记录保留
- ✅ 项目和里程碑保留
- ✅ 心树名字保留（已修复）

影响：用户会非常困惑，可能认为数据丢失了
```

### 场景 2：清除浏览器数据
```
当前状态：
- ❌ 所有等级和经验重置
- ❌ 成就全部消失
- ❌ 统计数据丢失
- ✅ 数据库中的数据保留

影响：用户可能误以为数据被删除
```

### 场景 3：隐私模式
```
当前状态：
- ❌ 经验和成就不保存
- ✅ 专注记录保存到数据库

影响：隐私模式下用户体验受损
```

---

## ✅ 修复方案

### 1️⃣ 数据库结构扩展

需要在 **User 表**添加以下字段：

```prisma
model User {
  id                     String         @id
  // ... 现有字段 ...
  heartTreeName          String?        @default("心树") // ✅ 已添加
  
  // 新增字段
  userExp                Float          @default(0)      // 用户经验值
  userLevel              Int            @default(1)      // 用户等级
  heartTreeExp           Float          @default(0)      // 心树经验值
  heartTreeLevel         Int            @default(1)      // 心树等级
  heartTreeCurrentExp    Float          @default(0)      // 心树当前等级经验
  heartTreeTotalExp      Float          @default(0)      // 心树累计经验
  lastWateredDate        String?                         // 最后浇水日期
  fertilizerExpiresAt    DateTime?                       // 施肥过期时间
  fertilizerMultiplier   Float?                          // 施肥倍率
  
  // ... 其他关系 ...
}
```

### 2️⃣ 新增 Achievement 表

```prisma
model Achievement {
  id             String   @id @default(cuid())
  userId         String
  achievementId  String   // 成就ID (如 'flow_master')
  category       String   // 成就类别
  unlockedAt     DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementId])
  @@index([userId])
  @@index([achievementId])
}
```

### 3️⃣ API 接口

#### 用户经验管理
- `POST /api/user/exp/update` - 更新用户经验
- `GET /api/user/exp` - 获取用户经验

#### 心树经验管理
- `POST /api/heart-tree/exp/update` - 更新心树经验
- `GET /api/heart-tree/exp` - 获取心树经验

#### 成就管理
- `POST /api/achievements/unlock` - 解锁成就
- `GET /api/achievements` - 获取用户成就列表

### 4️⃣ 前端 Hooks

创建统一管理 Hooks：
- `useUserExp()` - 管理用户经验
- `useHeartTreeExp()` - 管理心树经验
- `useAchievements()` - 管理成就

**策略**：双重保存 + 自动同步
```typescript
用户操作
  → localStorage (立即更新，快速反馈)
  → 数据库 (后台同步，持久化)
  → 定期同步检查
```

---

## 🎯 优先级修复计划

### Phase 1: 关键数据（必须立即修复）🔴

**时间**：1-2 小时
**内容**：
1. ✅ 心树名字 - **已完成**
2. ⚠️ 用户经验值 - **待修复**
3. ⚠️ 成就系统 - **待修复**
4. ⚠️ 心树经验状态 - **待修复**

**影响用户**：所有用户
**风险**：高（会导致数据丢失）

### Phase 2: 统计数据（次要）🟡

**时间**：0.5-1 小时
**内容**：
1. 每日/每周统计数据

**影响用户**：关注数据分析的用户
**风险**：中（数据可以从 FocusSession 重新计算）

### Phase 3: 其他优化🟢

**时间**：按需
**内容**：
1. 数据迁移工具
2. 数据同步优化
3. 离线支持

---

## 📈 数据同步策略

### 双重保存策略

```
写入流程：
1. 立即更新 localStorage（用户体验）
2. 异步保存到数据库（持久化）
3. 成功后标记已同步

读取流程：
1. 优先从数据库读取（最新数据）
2. 缓存到 localStorage（快速访问）
3. 后台定期同步
```

### 冲突解决

```
如果 localStorage 和数据库数据不一致：
1. 数据库是权威来源
2. 如果数据库更新，覆盖 localStorage
3. 如果 localStorage 更新，同步到数据库
```

### 自动迁移

```
首次登录时：
1. 检查 localStorage 是否有数据
2. 检查数据库是否为空
3. 如果 localStorage 有数据，数据库为空
   → 自动将 localStorage 数据迁移到数据库
4. 标记已迁移
```

---

## 🛡️ 数据安全保障

### 验证机制
- ✅ 所有 API 需要登录
- ✅ 数据范围验证（经验值、等级等）
- ✅ 防止数据篡改

### 备份机制
- ✅ 数据库是主要存储
- ✅ localStorage 作为缓存和备份
- ✅ 定期数据一致性检查

### 错误处理
- ✅ 数据库失败时使用 localStorage
- ✅ 详细的错误日志
- ✅ 用户友好的错误提示

---

## 📊 数据量估算

### 单用户数据大小

| 数据类型 | 估算大小 | 数量 | 总计 |
|---------|---------|------|------|
| 用户经验 | 20 bytes | 1 | 20 B |
| 心树经验 | 100 bytes | 1 | 100 B |
| 成就记录 | 50 bytes | 50个 | 2.5 KB |
| **总计** | | | **~3 KB** |

**结论**：数据量很小，完全适合存入数据库

---

## 🚀 部署步骤（Phase 1）

### 1. 数据库迁移
```bash
# 1. 修改 schema.prisma
# 2. 应用变更
npm run db:push
```

### 2. 创建 API 接口
```bash
# 创建以下文件：
- src/pages/api/user/exp/update.ts
- src/pages/api/user/exp/index.ts
- src/pages/api/heart-tree/exp/update.ts
- src/pages/api/heart-tree/exp/index.ts
- src/pages/api/achievements/unlock.ts
- src/pages/api/achievements/index.ts
```

### 3. 创建前端 Hooks
```bash
# 创建以下文件：
- src/hooks/useUserExp.ts
- src/hooks/useHeartTreeExp.ts
- src/hooks/useAchievements.ts
```

### 4. 更新现有代码
```bash
# 更新使用这些数据的组件
- src/pages/dashboard/index.tsx
- src/pages/dashboard/index.mobile.tsx
- src/lib/AchievementSystem.tsx
- src/lib/HeartTreeExpSystem.ts
```

### 5. 测试和验证
```bash
# 测试场景：
1. 新用户注册 → 获得经验 → 验证保存到数据库
2. 老用户登录 → 数据自动迁移
3. 换设备登录 → 数据同步
4. 清除浏览器 → 数据从数据库恢复
```

---

## 🔥 紧急程度评估

### 立即需要修复（今天）🔴
1. **用户经验值** - 用户会察觉到等级丢失
2. **成就系统** - 解锁的成就会消失
3. **心树经验** - 心树等级会重置

**原因**：这些数据直接影响用户体验，用户会明显感知到数据丢失

### 可以稍后修复（本周）🟡
1. **统计数据** - 可以从数据库重新计算

**原因**：可以通过 FocusSession 等数据重新计算，不会永久丢失

---

## 📝 用户通知建议

### 数据迁移通知

建议在修复部署后，向用户显示一次性通知：

```
🎉 数据安全升级

我们已经升级了数据存储系统：
✅ 你的经验、成就、心树等级现在永久保存
✅ 换设备登录数据自动同步
✅ 不会再丢失任何进度

你的现有数据已自动迁移，无需任何操作。
```

---

## ✨ 修复后的效果

### 数据持久化对比

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 换设备登录 | ❌ 经验/成就/心树全部丢失 | ✅ 自动同步 |
| 清除浏览器 | ❌ 所有进度重置 | ✅ 从数据库恢复 |
| 隐私模式 | ❌ 不保存进度 | ✅ 保存到数据库 |
| 多设备使用 | ❌ 数据不一致 | ✅ 自动同步 |

### 用户体验提升

- ✅ **数据安全**：永久保存到数据库
- ✅ **跨设备同步**：任何设备都能看到最新进度
- ✅ **快速响应**：localStorage 缓存保证速度
- ✅ **自动迁移**：老用户数据无缝迁移

---

## 🎯 总结

### 当前状态
- 🔴 **3个高危数据**只存储在 localStorage，会丢失
- 🟡 **1个中危数据**只存储在 localStorage
- ✅ **1个已修复**（心树名字）
- ✅ **1个特批**（用户头像）

### 建议
**立即修复** Phase 1 的 3 个高危数据，避免用户数据丢失和投诉。

### 预期工作量
- **Phase 1**: 2-3 小时（关键数据）
- **Phase 2**: 1 小时（统计数据）
- **测试**: 1 小时

**总计**: 约 4-5 小时完成全部修复

---

**审计日期**: 2024-12-16  
**审计人**: AI Assistant  
**状态**: ⚠️ 发现高危问题，建议立即修复



