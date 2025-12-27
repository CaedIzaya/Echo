# Dashboard 数据预加载系统

## 📋 功能概述

实现了完整的 Dashboard 数据预加载系统，确保所有关键数据（等级、成就、心树、经验值等）在显示主界面前都已加载完成。

---

## 🎯 核心特性

### 1. **数据预加载 Hook** (`useDashboardPreload`)
- 按顺序加载10项关键数据
- 显示实时加载进度
- 自动从数据库和localStorage按优先级读取
- 支持错误处理和降级

### 2. **漂亮的加载界面** (`DashboardLoading`)
- 显示加载进度百分比
- 实时显示当前加载任务
- 列表显示所有加载项的完成状态
- 渐变背景和动画效果

### 3. **数据完整性保证**
- 高优先级数据优先从数据库读取
- 数据库失败时自动fallback到localStorage缓存
- 确保关键数据不丢失

---

## 📦 新增文件

### 1. `src/hooks/useDashboardPreload.ts`
**功能**：Dashboard 数据预加载 Hook

**加载的数据**：
1. 用户经验值 (`userExp`)
2. 用户等级 (`userLevel`)
3. 心树经验值 (`heartTreeExp`)
4. 心树等级 (`heartTreeLevel`)
5. 心树名称 (`heartTreeName`)
6. 成就数据 (`achievements`)
7. 今日统计 (`todayStats`)
8. 本周统计 (`weeklyStats`)
9. 连续天数 (`streakDays`)
10. 用户计划 (`userPlans`)

**返回值**：
```typescript
{
  data: PreloadedData,  // 预加载的数据
  progress: {           // 加载进度
    total: number,
    loaded: number,
    currentTask: string
  }
}
```

### 2. `src/components/DashboardLoading.tsx`
**功能**：Dashboard 加载界面组件

**特性**：
- 渐变背景动画
- 进度条with光效
- 实时任务显示
- 加载项列表（带完成状态）

---

## 🔧 集成说明

### Dashboard 集成

**文件**：`src/pages/dashboard/index.tsx`

**修改内容**：
```typescript
// 1. 导入预加载 Hook 和加载组件
import { useDashboardPreload } from '~/hooks/useDashboardPreload';
import DashboardLoading from '~/components/DashboardLoading';

// 2. 使用预加载 Hook
const { data: preloadedData, progress: preloadProgress } = useDashboardPreload(userId);

// 3. 在认证检查中等待数据加载完成
useEffect(() => {
  if (authKey.startsWith('authenticated_')) {
    // 等待数据预加载完成后再显示界面
    if (!preloadedData.isComplete) {
      console.log('⏳ 数据预加载中...', {
        progress: `${preloadProgress.loaded}/${preloadProgress.total}`
      });
      return;
    }
    
    setIsLoading(false);
  }
}, [authKey, preloadedData.isComplete, preloadProgress]);

// 4. 显示加载界面
if (isLoading || !preloadedData.isComplete) {
  return <DashboardLoading progress={preloadProgress} />;
}
```

---

## 🔄 数据加载流程

```
用户登录
  ↓
设置用户ID (setCurrentUserId)
  ↓
迁移旧数据 (migrateToUserStorage)
  ↓
跳转到 Dashboard
  ↓
触发 useDashboardPreload
  ↓
按顺序加载10项数据:
  1. 用户经验值 (从数据库/localStorage)
  2. 用户等级 (计算)
  3. 心树经验值 (从数据库/localStorage)
  4. 心树等级 (计算)
  5. 心树名称 (从数据库/localStorage)
  6. 成就数据 (从数据库/localStorage)
  7. 今日统计 (从localStorage)
  8. 本周统计 (从localStorage)
  9. 连续天数 (从数据库/localStorage)
  10. 用户计划 (从数据库/localStorage)
  ↓
所有数据加载完成 (isComplete = true)
  ↓
显示 Dashboard 主界面
```

---

## ⏱️ 加载时间优化

### 预期加载时间
- **最快**：~500ms（所有数据从localStorage缓存读取）
- **正常**：1-2秒（部分数据从数据库读取）
- **较慢**：2-3秒（所有数据从数据库读取）

### 优化策略
1. **并行加载**：可以改为并行加载多个数据项（当前是串行）
2. **缓存优先**：优先使用localStorage缓存，后台同步数据库
3. **分批显示**：关键数据加载完成后先显示界面，次要数据后台加载

---

## 🎨 加载界面设计

### 视觉元素
- **背景**：渐变色（teal-50 → cyan-50 → sky-50）
- **装饰**：两个动态光晕气泡
- **Logo**：旋转的加载图标
- **进度条**：带光效的渐变进度条
- **任务列表**：10项加载任务，实时显示完成状态

### 交互反馈
- 实时更新进度百分比
- 显示当前正在加载的任务
- 完成的项目显示✓，进行中的项目闪烁

---

## 🔐 数据安全保证

### 1. 用户数据隔离
- 每个用户的数据独立存储
- 使用 `user_{userId}_` 前缀隔离

### 2. 数据优先级
- 高优先级数据必须从数据库读取
- 确保关键数据（经验值、等级、成就）不丢失

### 3. 错误处理
- 数据库加载失败时自动fallback到localStorage
- 显示错误信息但不阻塞用户使用

---

## 📊 加载进度示例

```
加载进度: 0%  → 初始化...
加载进度: 10% → 加载用户经验值
加载进度: 20% → 加载用户等级
加载进度: 30% → 加载心树经验值
加载进度: 40% → 加载心树等级
加载进度: 50% → 加载心树名称
加载进度: 60% → 加载成就数据
加载进度: 70% → 加载今日统计
加载进度: 80% → 加载本周统计
加载进度: 90% → 加载连续天数
加载进度: 100% → 加载用户计划
完成！ → 显示 Dashboard
```

---

## 🚀 后续优化建议

### 1. 并行加载
将独立的数据项改为并行加载，减少总加载时间：
```typescript
const [userExpData, heartTreeExpData, achievementsData] = await Promise.all([
  DataLoader.load('userExp', fetchUserExp),
  DataLoader.load('heartTreeExp', fetchHeartTreeExp),
  DataLoader.load('achievements', fetchAchievements),
]);
```

### 2. 渐进式渲染
关键数据加载完成后先显示基础界面，次要数据后台加载：
```typescript
// 第一阶段：加载核心数据（用户等级、心树）
// 第二阶段：加载统计数据（今日、本周）
// 第三阶段：加载扩展数据（成就、计划）
```

### 3. 智能缓存
根据数据更新频率调整缓存策略：
- 用户等级：缓存1小时
- 今日统计：缓存5分钟
- 成就数据：缓存30分钟

### 4. 离线支持
检测网络状态，离线时直接使用缓存：
```typescript
if (!navigator.onLine) {
  // 直接使用localStorage缓存
  return userStorageJSON.get(key);
}
```

---

## 🧪 测试建议

### 1. 正常加载测试
- [ ] 登录后应显示加载界面
- [ ] 进度条应平滑增长
- [ ] 所有10项任务应依次显示
- [ ] 加载完成后应显示Dashboard

### 2. 慢网络测试
- [ ] 模拟慢网络（Chrome DevTools → Network → Slow 3G）
- [ ] 加载时间应延长但不应卡死
- [ ] 进度条应持续更新

### 3. 数据库失败测试
- [ ] 断开数据库连接
- [ ] 应该fallback到localStorage缓存
- [ ] 显示警告但不阻塞用户

### 4. 首次登录测试
- [ ] 新用户注册
- [ ] 应该显示"加载中..."
- [ ] 数据库无数据时应使用默认值

---

## 📝 相关文件清单

### 新增文件
1. `src/hooks/useDashboardPreload.ts` - 数据预加载 Hook
2. `src/components/DashboardLoading.tsx` - 加载界面组件
3. `src/components/LoadingOverlay.tsx` - 通用Loading遮罩
4. `src/lib/userStorage.ts` - 用户隔离存储工具
5. `src/lib/dataPriority.ts` - 数据优先级管理
6. `docs/DASHBOARD_PRELOAD_SYSTEM.md` - 本文档

### 修改文件
1. `src/pages/dashboard/index.tsx` - 集成预加载系统
2. `src/pages/index.tsx` - 设置用户ID
3. `src/pages/auth/signin.tsx` - 登录/注册后设置用户ID
4. `src/pages/onboarding/goal-setting.tsx` - 使用用户隔离存储

---

**完成时间**：2025-12-27  
**版本**：v2.0.0



