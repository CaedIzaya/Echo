# Onboarding 和数据管理优化完成报告

## 📋 实现的功能

### 1. ✅ Onboarding 完成逻辑修复

**问题**：之前用户点击"稍后再说"也会被标记为完成 onboarding，导致无法再次进入引导流程。

**解决方案**：
- 只有在用户**创建计划并提交表单**后，才调用 `/api/user/complete-onboarding` 标记完成
- 点击"稍后再说"只会跳转到 dashboard，不会标记 onboarding 完成
- 下次登录时，未完成 onboarding 的用户会被重新引导到 onboarding 页面

**关键代码位置**：
- `src/pages/onboarding/goal-setting.tsx` (第 417-432 行)
- `src/pages/index.tsx` (第 873-878 行)

```typescript
// 只有在新用户首次创建计划时，才标记onboarding完成
if (!allowReturn && !isEditMode) {
  const onboardingResponse = await fetch('/api/user/complete-onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

### 2. ✅ 防止用户误点的 Loading 遮罩

**问题**：用户在关键操作（注册、提交表单）时可能误点其他按钮，导致操作中断。

**解决方案**：
- 创建了 `LoadingOverlay` 组件，显示半透明遮罩和加载动画
- 在以下关键时刻显示遮罩：
  - 注册/登录提交时
  - 创建计划提交时

**组件位置**：
- `src/components/LoadingOverlay.tsx`

**使用示例**：
```typescript
{isSubmitting && <LoadingOverlay message="正在创建计划..." />}
```

**集成位置**：
- `src/pages/auth/signin.tsx` - 登录/注册页面
- `src/pages/onboarding/goal-setting.tsx` - 创建计划页面

---

### 3. ✅ localStorage 按账号隔离存储

**问题**：多个账号登录同一设备时，localStorage 数据会相互覆盖。

**解决方案**：
- 创建了 `userStorage` 工具类，自动为每个用户的数据添加 `user_{userId}_` 前缀
- 提供了数据迁移功能，将旧的全局数据迁移到用户隔离存储
- 支持 JSON 格式的便捷操作

**工具类位置**：
- `src/lib/userStorage.ts`

**核心 API**：
```typescript
// 设置当前用户ID（登录时调用）
setCurrentUserId(userId: string)

// 获取用户数据
getUserStorage(key: string): string | null
userStorageJSON.get<T>(key: string, defaultValue?: T): T | null

// 设置用户数据
setUserStorage(key: string, value: string)
userStorageJSON.set<T>(key: string, value: T)

// 删除用户数据
removeUserStorage(key: string)

// 清除当前用户所有数据
clearUserStorage()

// 迁移旧数据
migrateToUserStorage(keys: string[])
```

**使用示例**：
```typescript
// 登录时设置用户ID
if (session.user.id) {
  setCurrentUserId(session.user.id);
  migrateToUserStorage(['userPlans', 'todayStats']);
}

// 读写数据
const plans = userStorageJSON.get<any[]>('userPlans', []);
userStorageJSON.set('userPlans', updatedPlans);
```

**已集成位置**：
- `src/pages/index.tsx` - 登录时设置用户ID
- `src/pages/onboarding/goal-setting.tsx` - 使用用户隔离存储

---

### 4. ✅ 数据优先级管理系统

**问题**：数据库和 localStorage 数据不一致，不知道该优先读取哪个。

**解决方案**：
- 创建了 `dataPriority` 工具类，定义数据优先级规则
- 高优先级数据（用户经验、心树等）必须从数据库读取
- 中优先级数据优先数据库，fallback 到 localStorage
- 低优先级数据（UI 状态等）只用 localStorage

**工具类位置**：
- `src/lib/dataPriority.ts`

**数据优先级配置**：
```typescript
// 高优先级：必须从数据库读取
HIGH_PRIORITY: [
  'userExp',          // 用户经验值
  'userLevel',        // 用户等级
  'heartTreeExp',     // 心树经验值
  'heartTreeLevel',   // 心树等级
  'heartTreeName',    // 心树名称
  'streakDays',       // 连续天数
  'userPlans',        // 用户计划
]

// 中优先级：优先数据库，fallback localStorage
MEDIUM_PRIORITY: [
  'todayStats',       // 今日统计
  'weeklyStats',      // 本周统计
  'focusSessions',    // 专注记录
]

// 低优先级：只用 localStorage
LOW_PRIORITY: [
  'userPreferences',  // 用户偏好
  'uiState',          // UI状态
  'theme',            // 主题设置
]
```

**核心 API**：
```typescript
// 加载数据（按优先级）
const { data, source } = await DataLoader.load<T>(
  'userExp',
  async () => {
    // 从数据库获取
    const res = await fetch('/api/user/exp');
    return await res.json();
  },
  defaultValue
);

// 保存数据（同时保存到数据库和localStorage）
await DataLoader.save(
  'userExp',
  newExpValue,
  async (data) => {
    // 保存到数据库
    await fetch('/api/user/exp/update', {
      method: 'POST',
      body: JSON.stringify({ exp: data })
    });
  }
);

// 数据完整性检查
const { missing, ok } = await DataIntegrityChecker.checkIntegrity(userId);
if (!ok) {
  console.warn('缺失数据:', missing);
  // 修复缺失数据
  await DataIntegrityChecker.repairMissingData(missing, fetchFunctions);
}
```

---

## 🔧 如何使用

### 1. 新用户注册流程

1. 用户注册 → 显示 Loading 遮罩
2. 注册成功 → 自动设置用户ID，启用数据隔离
3. 跳转到 onboarding 页面
4. 用户选择兴趣 → 聚焦兴趣 → 创建计划
5. **提交表单** → 标记 onboarding 完成 → 跳转 dashboard
6. 如果点击"稍后再说" → 不标记完成 → 下次登录继续引导

### 2. 数据隔离使用

```typescript
// 在登录后设置用户ID
import { setCurrentUserId, migrateToUserStorage } from '~/lib/userStorage';

if (session.user.id) {
  setCurrentUserId(session.user.id);
  
  // 首次登录迁移旧数据
  migrateToUserStorage(['userPlans', 'todayStats', 'weeklyStats']);
}

// 使用用户隔离存储
import { userStorageJSON } from '~/lib/userStorage';

// 读取
const plans = userStorageJSON.get<Plan[]>('userPlans', []);

// 写入
userStorageJSON.set('userPlans', updatedPlans);
```

### 3. 数据优先级管理

```typescript
import { DataLoader } from '~/lib/dataPriority';

// 加载用户经验值（高优先级，必须从数据库）
const { data: userExp } = await DataLoader.load<number>(
  'userExp',
  async () => {
    const res = await fetch('/api/user/exp');
    const json = await res.json();
    return json.exp;
  },
  0 // 默认值
);

// 保存用户经验值（同时保存到数据库和localStorage）
await DataLoader.save(
  'userExp',
  newExpValue,
  async (exp) => {
    await fetch('/api/user/exp/update', {
      method: 'POST',
      body: JSON.stringify({ exp })
    });
  }
);
```

---

## 📝 注意事项

1. **用户ID设置时机**：必须在登录成功后立即调用 `setCurrentUserId()`
2. **数据迁移**：首次登录时自动迁移，后续登录不会重复迁移
3. **Loading遮罩**：关键操作时必须显示，防止用户误点
4. **Onboarding完成标记**：只在提交表单时调用，不在"稍后再说"时调用

---

## 🎯 测试建议

### 1. Onboarding 流程测试
- [ ] 新用户注册 → 完整走完 onboarding → 检查是否标记完成
- [ ] 新用户注册 → 点击"稍后再说" → 退出登录 → 再次登录 → 应该重新进入 onboarding
- [ ] 已完成 onboarding 的用户 → 登录 → 应该直接进入 dashboard

### 2. 数据隔离测试
- [ ] 账号A登录 → 创建计划 → 退出
- [ ] 账号B登录 → 不应该看到账号A的计划
- [ ] 账号A再次登录 → 应该看到自己的计划

### 3. Loading 遮罩测试
- [ ] 注册时 → 应该显示"注册中..."遮罩
- [ ] 登录时 → 应该显示"登录中..."遮罩
- [ ] 创建计划提交时 → 应该显示"正在创建计划..."遮罩
- [ ] 遮罩显示时 → 不应该能点击其他按钮

### 4. 数据优先级测试
- [ ] 清空 localStorage → 登录 → 应该从数据库加载高优先级数据
- [ ] 数据库和 localStorage 不一致 → 应该优先使用数据库数据
- [ ] 离线状态 → 应该使用 localStorage 缓存数据

---

## 🚀 后续优化建议

1. **数据同步策略**：定期从数据库同步高优先级数据到 localStorage
2. **离线支持**：在离线状态下缓存操作，上线后同步到数据库
3. **数据冲突解决**：当数据库和 localStorage 都有修改时的冲突解决策略
4. **性能优化**：批量加载数据，减少API调用次数

---

## 📦 新增文件清单

1. `src/components/LoadingOverlay.tsx` - Loading 遮罩组件
2. `src/lib/userStorage.ts` - 用户隔离存储工具类
3. `src/lib/dataPriority.ts` - 数据优先级管理工具类
4. `docs/ONBOARDING_AND_DATA_MANAGEMENT.md` - 本文档

## 🔄 修改文件清单

1. `src/pages/index.tsx` - 集成用户ID设置和数据迁移
2. `src/pages/onboarding/goal-setting.tsx` - 修复 onboarding 完成逻辑，添加 Loading 遮罩
3. `src/pages/auth/signin.tsx` - 添加 Loading 遮罩

---

**完成时间**：2025-12-27
**版本**：v1.0.0

