# 成就系统技术文档

## 架构总览

```
AchievementTypes.ts     定义成就枚举、数据结构、ALL_ACHIEVEMENTS 静态列表
AchievementSystem.tsx   AchievementManager 单例：检查 / 解锁 / 同步 / 特殊成就判定
useAchievements.ts      React Hook：前端状态管理 + 数据库双向同步
AchievementPanel.tsx    成就展示面板 UI（分类筛选 + 进度条）
API /achievements       GET 获取已解锁列表 / POST 解锁并写入数据库
```

## 存储策略

- **主存储**：数据库 `achievements_unlocked` 表（`userId + achievementId` 唯一）
- **缓存**：用户隔离的 localStorage（`achievedAchievements` key）
- **同步**：启动时 `syncFromDatabase()` 执行数据库 → 本地合并；本地有而数据库缺失时自动回填

## 成就类别

| 类别 | category 值 | 数量 | 检查方法 |
|------|-------------|------|----------|
| 心流指数 | `flow` | 4 | `checkFlowIndexAchievements(score)` |
| 累计时长 | `time` | 5 | `checkTotalTimeAchievements(hours)` |
| 单日时长 | `daily` | 4 | `checkDailyTimeAchievements(hours)` |
| 小目标 | `milestone` | 4 | `checkMilestoneAchievements(count)` |
| 初体验 | `first` | 13 | `checkFirstTimeAchievements(type)` + 心树系列 |
| 特殊 | `special` | 9 | `checkSpecialVisitAchievements()` + `checkSpecialFocusAchievements()` |

## 特殊成就

### 上线时段成就

在 Dashboard 加载时自动调用 `checkSpecialVisitAchievements()`。

| 成就 | 时间窗口 | 条件 |
|------|----------|------|
| 🦉 夜猫子 | 22:30 ~ 3:00 | 在此窗口上线 7 次（不同日期） |
| 🌅 晨曦见证者 | 5:30 ~ 8:30 | 在此窗口上线 7 次（不同日期） |

上线日期记录在 localStorage：`special_night_owl_visits` / `special_dawn_witness_visits`。

### 专注行为成就

在 `focus/index.tsx` 中，`POST /api/focus-sessions` 成功后调用 `checkSpecialFocusAchievements(startTime, isMinMet, domainKey)`。

| 成就 | 时间窗口 | 所需计划域 |
|------|----------|-----------|
| 🌙 深夜行者 | 22:30 ~ 3:00 | 不限 |
| 🌄 清晨行者 | 5:30 ~ 8:30 | 不限 |
| ☕ 下午茶 | 13:00 ~ 15:30 | `food` |
| 🏃 晨练者 | 6:30 ~ 9:30 | `sports` |
| 📖 晨读 | 6:30 ~ 9:30 | `reading` |
| 📚 睡前阅读 | 21:30 ~ 24:00 | `reading` |
| 🎮 爆肝选手 | 0:00 ~ 3:00 | `game` |

域映射通过 `PLAN_DESC_TO_DOMAIN_KEY` 将 `Project.description`（focusBranch）映射到域 key。

## 检测时机

| 时机 | 检查内容 |
|------|----------|
| Dashboard 加载 | flow / time / daily / milestone / first / **special visit** |
| 专注完成保存后 | **special focus**（时段 + 域） |
| 里程碑完成 | milestone |
| 计划创建 / 完成 | first |
| 心树浇水 / 施肥 / 升级 | heart tree 系列 |

## 代码示例

```typescript
import { getAchievementManager } from '~/lib/AchievementSystem';

const manager = getAchievementManager();

// 上线时段检查（Dashboard 中调用）
const visitAchievements = manager.checkSpecialVisitAchievements();

// 专注完成后检查
const focusAchievements = manager.checkSpecialFocusAchievements(
  new Date(startTime),  // 专注开始时间
  isMinMet,             // 是否达标
  'reading',            // 计划域 key（可选）
);

// 获取统计
const stats = manager.getAchievementStats();
// { total: 39, achieved: 12, progress: 31 }
```
