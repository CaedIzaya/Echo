# ⚡ 心树名字修复 - 快速部署

## 🚨 问题
心树名字只存储在 localStorage，**换设备后会丢失**。

## ✅ 解决方案
将心树名字保存到数据库，实现跨设备同步。

---

## 🚀 立即修复（3步）

### 1. 应用数据库变更
```bash
npm run db:push
```

**这会做什么**：
- 在 User 表添加 `heartTreeName` 字段
- 设置默认值为 `"心树"`
- 不影响现有数据

### 2. 推送代码
```bash
git add .
git commit -m "fix: 心树名字持久化到数据库，解决跨设备丢失问题"
git push origin main
```

**Vercel 会自动部署**（约 3-5 分钟）

### 3. 验证修复
```bash
# 测试新用户
1. 创建测试账号
2. 给心树起名 "测试树"
3. 登出再登录
   ✅ 应该看到 "测试树" 而不是 "心树"

# 测试老用户
1. 登录现有账号
2. Hook 自动迁移 localStorage 数据到数据库
3. 换设备登录
   ✅ 名字自动同步
```

---

## 📊 效果对比

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 换设备登录 | ❌ 心树名字丢失 | ✅ 自动同步 |
| 清除浏览器数据 | ❌ 心树名字丢失 | ✅ 从数据库恢复 |
| 隐私模式 | ❌ 不保存 | ✅ 保存到数据库 |
| 登出再登录（同设备） | ✅ 保留 | ✅ 保留 |

---

## 🔍 技术细节

### 新增内容
1. **数据库字段**: `User.heartTreeName`
2. **API 接口**: 
   - `POST /api/heart-tree/update-name` 
   - `GET /api/heart-tree/get-name`
3. **前端 Hook**: `useHeartTreeName`

### 数据同步策略
```
用户命名 
  → localStorage (立即显示，快速反馈)
  → 数据库 (持久化，跨设备同步)
```

### 自动迁移
- 老用户的 localStorage 数据会**自动同步到数据库**
- 无需手动操作
- 无数据丢失风险

---

## 📁 修改的文件

**新增**:
- `src/pages/api/heart-tree/update-name.ts`
- `src/pages/api/heart-tree/get-name.ts`
- `src/hooks/useHeartTreeName.ts`
- `HEART_TREE_NAME_FIX.md`（详细文档）
- `HEART_TREE_NAME_QUICK_FIX.md`（本文档）

**修改**:
- `prisma/schema.prisma`
- `src/pages/dashboard/HeartTree.tsx`
- `src/pages/heart-tree.tsx`

---

## 🛡️ 安全性

- ✅ 完全向后兼容
- ✅ 自动数据迁移
- ✅ 零数据丢失
- ✅ 降级策略：数据库失败时使用 localStorage

---

## 🎉 完成！

修复后：
- ✅ 心树名字永久保存
- ✅ 跨设备自动同步
- ✅ 不会再丢失
- ✅ 老用户数据自动迁移

---

**部署时间**: < 10 分钟  
**风险等级**: ⭐ 低（向后兼容）  
**数据安全**: ✅ 无丢失风险

**查看详细文档**: `HEART_TREE_NAME_FIX.md`




