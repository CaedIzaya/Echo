# 完整上传文件清单（本次对话所有修改）

## 📦 需要上传到ECS的文件（12个）

```
1.  src/lib/themeSystem.ts
2.  src/pages/api/shop/items.ts
3.  src/pages/api/user/theme.ts
4.  src/components/shop/ShopModal.tsx
5.  src/pages/dashboard/index.tsx
6.  src/pages/dashboard/AchievementPanel.tsx
7.  src/pages/dashboard/SpiritDialog.tsx
8.  src/pages/dashboard/EchoSpirit.tsx
9.  src/pages/dashboard/EchoSpiritMobile.tsx
10. src/pages/plans/index.tsx
11. src/hooks/useProjects.ts
12. prisma/schema.prisma
```

---

## ✅ 完成的功能

### 1. 主题系统
- 🌊 Echo基调（蓝绿色，略深，呼吸动画）
- 💠 海盐淡蓝（超淡蓝色，如香水般淡雅）
- 🌿 生机嫩绿（清新绿色，充满生机）
- 主题保存到数据库（User.selectedTheme字段）
- 购买后可切换，当前主题显示"还原默认主题"

### 2. 勋章系统
- 青铜/白银/黄金勋章
- 购买后在成就面板显示
- 金色渐变卡片展示

### 3. 小精灵对话修复
- 队列系统正常工作
- 移除抖动反馈
- 所有文案按顺序完整播放
- 支持动态文案池（根据等级和心流）

### 4. 主要计划切换修复 ⭐
- Dashboard直接使用数据库数据
- 切换主要计划后清除缓存
- Dashboard自动刷新显示新计划
- 删除计划后清除残留数据

---

## 🔧 关键修复

### 问题1：计划残留
**原因**：useProjects使用1小时缓存策略，删除计划后Dashboard还显示旧缓存

**解决**：
- 删除计划时清除缓存
- 切换主要计划时清除缓存时间戳
- Dashboard监听storage事件并刷新

### 问题2：小目标同步
**修复**：
- 完成小目标后调用`refreshProjects()`
- 立即同步到数据库
- 自动刷新Dashboard显示

---

## 🚀 ECS部署步骤

```bash
# 1. 上传12个文件

# 2. 在服务器执行
cd /www/wwwroot/echoo.xin
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart echo-focus
```

---

## 🧪 测试清单

### 主题切换
- [ ] 购买主题
- [ ] 点击"设置主题"
- [ ] 背景变色
- [ ] 打开商城，当前主题显示"还原默认主题"
- [ ] 点击还原，背景变回白色

### 主要计划切换
- [ ] Dashboard显示planA
- [ ] 去Plans页面，设置planB为主要
- [ ] 返回Dashboard
- [ ] **立即显示planB的信息和小目标** ✅

### 计划删除
- [ ] Dashboard显示planA
- [ ] 去Plans页面，删除planA
- [ ] 返回Dashboard
- [ ] **不显示残留数据** ✅

### 小目标同步
- [ ] Dashboard完成小目标
- [ ] 刷新页面或去Plans查看
- [ ] **小目标显示已完成** ✅

---

## 📊 数据库变更

### User表新增字段
```sql
selectedTheme String? @default("default")
```

---

**总计：12个文件需要上传**

