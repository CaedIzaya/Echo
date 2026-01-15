# Echo 邮件系统 + 周报系统完整部署清单

## ✅ 构建状态
**已通过 `npm run build` 验证，无类型错误！**

---

## 📦 需要上传到 ECS 的文件（共 30 个）

### 数据库 Schema
```
1. prisma/schema.prisma
```

### 邮件系统（数据库版）
```
2. src/lib/MailSystem.ts
3. src/pages/api/mails/index.ts
4. src/pages/api/mails/backfill.ts (新增 - 邮件补发)
5. src/pages/api/auth/register.ts
```

### 周报系统（锚点日期 + 定时任务）
```
6.  src/lib/weeklyReport.ts
7.  src/pages/api/weekly-report/auto.ts (新增 - 自动周报)
8.  src/pages/api/weekly-report/cron.ts (新增 - cron 任务)
9.  src/pages/api/weekly-report/index.ts
10. src/pages/api/generate-weekly-mail.ts
11. src/pages/reports/weekly.tsx
```

### 触发邮件系统（升级/勋章/果实）
```
12. src/pages/api/user/exp/update.ts (升级触发)
13. src/pages/api/shop/purchase.ts (勋章触发)
14. src/pages/api/heart-tree/exp/update.ts (果实触发)
```

### Dashboard 集成（PC + Mobile）
```
15. src/pages/dashboard/index.tsx
16. src/pages/dashboard/index.mobile.tsx
```

### 修复的 API（移除不存在的字段）
```
17. src/pages/api/heart-tree/water.ts
18. src/pages/api/heart-tree/fertilize.ts
19. src/pages/api/user/fruits.ts
20. src/pages/api/user/theme.ts
```

---

## 🚀 ECS 部署步骤

### 1. 上传文件
将以上 20 个文件上传到 ECS 对应路径。

### 2. 设置环境变量
在 `.env.local` 或 `.env.production` 中添加：
```bash
CRON_SECRET=你的强随机密钥（例如：32位随机字符串）
```

### 3. 数据库迁移与生成
```bash
cd /www/wwwroot/echoo.xin

# 推送 schema 变更（新增 Mail、ShopPurchase 表，User 新增字段）
npx prisma db push

# 重新生成 Prisma Client
npx prisma generate
```

### 4. 构建与重启
```bash
npm run build
pm2 restart echo-focus
```

### 5. 设置 Cron 定时任务
编辑 crontab：
```bash
crontab -e
```

添加以下行（每天 08:00 触发周报）：
```
0 8 * * * curl -s -X POST https://echoo.xin/api/weekly-report/cron -H "Authorization: Bearer 你的CRON_SECRET" >/dev/null 2>&1
```

**请将 `你的CRON_SECRET` 替换为你在 `.env.local` 中设置的实际值！**

---

## 🎯 功能验证清单

### 邮件系统验证
- [ ] 注册新账号，登录后打开邮箱（📬），应看到**欢迎邮件**
- [ ] 已有用户登录，应自动触发邮件补发（console 可见 `[mails/backfill]`）
- [ ] 刷新后，邮箱内容不丢失（数据库持久化）

### 周报系统验证
- [ ] 在 ECS 上手动调用测试：
  ```bash
  curl -X POST https://echoo.xin/api/weekly-report/auto \
    -H "Authorization: Bearer 你的CRON_SECRET"
  ```
- [ ] 如果用户注册满 7 天，应在邮箱收到周报邮件
- [ ] 周报邮件标题格式：`本周专注周报 · MM/DD - MM/DD`
- [ ] 周报数据来源：`FocusSession`、`DailySummary`、`Milestone`（全部数据库）

### 升级邮件验证
- [ ] 用户等级达到 2/5/10/20 时，收到对应 Lumi 邮件
- [ ] 邮件标题：`嗨，在 Echo 里还适应吗？` / `有件小事想跟你说` / ...
- [ ] 邮件标记为永久保存（`isPermanent = true`）

### 勋章邮件验证
- [ ] 购买青铜勋章，收到邮件（Lumi x 心树）
- [ ] 购买白银勋章，收到邮件
- [ ] 购买黄金勋章，收到邮件
- [ ] 购买钻石勋章，收到特殊邮件（来自 Callum）

### 果实邮件验证
- [ ] 累计果实达到 1 个，收到心树邮件
- [ ] 累计果实达到 5 个，收到心树邮件
- [ ] 累计果实达到 10 个，收到心树邮件
- [ ] 心树名字正确显示在邮件中

---

## 📊 数据库变更摘要

### User 表新增字段
- `fruits: Int` - 当前果实
- `totalFruitsEarned: Int` - 累计获得果实（用于触发邮件）

### Mail 表（新增）
- `id, userId, title, content, date, sender, type`
- `isRead, isPermanent, actionUrl, actionLabel, expiresAt`
- 索引：`(userId, date)`, `(userId, isRead)`, `expiresAt`

### ShopPurchase 表（新增）
- `id, userId, itemId, itemType, price, createdAt`
- 唯一索引：`(userId, itemId)`

---

## ⚠️ 重要说明

### 周报触发逻辑
- **锚点日期**：用户的 `createdAt`（注册日期）
- **周期规则**：每 7 天一次（不是周一，而是 `注册日 + N * 7`）
- **首次周报**：注册满 7 天后，第 8 天早上 8:00 触发
- **后续周报**：每隔 7 天触发一次

### 邮件补发机制
- 登录时自动调用 `/api/mails/backfill`
- 补发范围：欢迎、升级、勋章、果实（**不含周报**）
- 防重复：数据库 `Mail.id` 唯一，已存在则跳过

### 已移除的字段
以下字段在 schema 中不存在，相关 API 已修复为不依赖：
- `wateringCount` - 浇水次数（已集成到 `lastWateredDate`）
- `fertilizerCount` - 施肥次数（已集成到 `fertilizerBuff`）
- `selectedTheme` - 主题选择（现存储在 localStorage）

---

## 🎉 完成检查
- [x] 本地 `npm run build` 通过
- [x] Schema 包含所有必需字段
- [x] 邮件系统全部从数据库读取
- [x] 周报锚点逻辑已实现
- [x] Cron 任务接口已加安全验证
- [x] 邮件补发机制已加入
- [ ] ECS 部署完成
- [ ] 功能验证通过

---

**部署前请务必备份数据库！**

