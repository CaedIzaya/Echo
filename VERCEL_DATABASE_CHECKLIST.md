# Vercel 数据库连接检查清单

## ✅ 本地测试结果

**状态：** 全部通过 ✅

本地数据库连接测试已完成，所有 8 个测试都成功：
- ✅ 基本连接测试
- ✅ 简单查询测试
- ✅ 表结构检查（14 个表）
- ✅ 用户表查询（2 个用户）
- ✅ 写入测试（创建、读取、删除）
- ✅ 事务测试（回滚正常）
- ✅ 并发查询测试（连接池正常）
- ✅ 复杂关联查询测试

**结论：** 你的本地服务器可以正确连接和使用 Neon PostgreSQL 数据库。

---

## 🔍 Vercel 上数据不保存的可能原因

既然本地测试正常，Vercel 上的问题可能是：

### 1. 环境变量配置问题 ⭐ 最可能

**需要检查：**
- [ ] Vercel 上是否设置了 `DATABASE_URL` 环境变量
- [ ] 是否为所有环境（Production, Preview, Development）都设置了
- [ ] 环境变量的值是否与本地 `.env` 中的一致
- [ ] 修改环境变量后是否重新部署了

**如何检查：**
1. 登录 [Vercel 仪表板](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 查看 `DATABASE_URL` 是否存在

**如何修复：**
```bash
# 方法 1: 通过 Vercel CLI（需要先登录）
vercel login
vercel env add DATABASE_URL production

# 然后输入你的数据库连接字符串（与本地 .env 中的相同）
```

或者在 Vercel 仪表板中手动添加：
- **Name:** `DATABASE_URL`
- **Value:** 从你的 `.env` 文件中复制 `DATABASE_URL` 的值
- **Environment:** 选择 Production, Preview, Development

**⚠️ 重要：** 添加或修改环境变量后，必须重新部署应用！

---

### 2. Prisma Client 未在 Vercel 上生成

**症状：** 部署成功但运行时出错

**需要检查：**
- [ ] `package.json` 中是否有 `postinstall` 脚本
- [ ] 构建日志中是否有 `prisma generate` 成功执行

**如何检查：**
查看你的 `package.json`：
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

**已确认：** ✅ 你的项目中已经配置了此脚本

---

### 3. 代码逻辑问题

**可能的情况：**
- 数据只保存在前端（localStorage）而不是数据库
- 数据库操作有错误但没有显示
- 事务被回滚但没有日志

**如何检查：**
- 查看 Vercel 的 Runtime Logs
- 检查代码中是否所有数据操作都使用了 `db.model.create()` 等方法
- 确认没有仅依赖 localStorage

---

### 4. Neon 数据库问题

**可能的情况：**
- 数据库被暂停（Neon 免费版会在闲置后暂停）
- 连接字符串过期
- IP 被限制

**如何检查：**
1. 登录 [Neon 控制台](https://console.neon.tech/)
2. 检查数据库状态是否为 "Active"
3. 查看是否有错误日志

**已修复：** ✅ 你的代码中已经添加了连接重试和健康检查机制

---

## 🚀 立即执行的步骤

### 步骤 1: 登录 Vercel CLI 并检查配置

```bash
# 登录 Vercel
vercel login

# 链接项目（如果还未链接）
vercel link

# 检查环境变量
vercel env ls production

# 运行完整检查（再次运行我们的脚本）
npx tsx scripts/check-vercel-config.ts
```

---

### 步骤 2: 在 Vercel 上测试数据库连接

我已经创建了一个测试 API 路由：`src/pages/api/test-db.ts`

**部署后访问：**
```
https://your-app.vercel.app/api/test-db
```

**期望的成功响应：**
```json
{
  "success": true,
  "timestamp": "2025-12-26T...",
  "environment": {
    "nodeEnv": "production",
    "hasDatabaseUrl": true,
    "databaseType": "Neon PostgreSQL",
    "isPooler": true
  },
  "tests": {
    "connection": { "passed": true, "message": "数据库连接成功" },
    "simpleQuery": { "passed": true, "message": "简单查询成功" },
    "tableCount": { "passed": true, "message": "找到 14 个表", "count": 14 },
    "userCount": { "passed": true, "message": "用户数量: 2", "count": 2 },
    "writeTest": { "passed": true, "message": "数据写入、读取和删除成功" }
  }
}
```

**如果失败：**
- 查看 `error` 字段了解具体错误
- 查看 `environment` 部分确认环境变量是否加载
- 查看 `tests` 部分确定哪个测试失败了

---

### 步骤 3: 检查 Vercel 部署日志

1. 进入 Vercel 仪表板
2. 点击最新的部署
3. 查看 **Build Logs** 和 **Runtime Logs**
4. 搜索关键词：
   - `prisma generate` - 应该显示成功
   - `DATABASE_URL` - 确认被加载
   - `error` - 查看错误信息

---

### 步骤 4: 确认环境变量并重新部署

如果发现环境变量缺失或错误：

**方法 1: 通过 Vercel CLI**
```bash
# 添加/更新环境变量
vercel env add DATABASE_URL production

# 触发重新部署
vercel --prod
```

**方法 2: 通过 Vercel 仪表板**
1. Settings → Environment Variables
2. 添加或编辑 `DATABASE_URL`
3. 保存后，进入 Deployments 标签
4. 点击最新部署旁的 "..." 菜单
5. 选择 "Redeploy"

---

## 📋 完整环境变量列表

确保以下环境变量在 Vercel 上都已设置：

| 变量名 | 是否必需 | 说明 |
|--------|---------|------|
| `DATABASE_URL` | ✅ 必需 | Neon PostgreSQL 连接字符串（使用 pooler 端点） |
| `NEXTAUTH_SECRET` | ✅ 必需 | NextAuth 密钥 |
| `NEXTAUTH_URL` | ⚠️ 生产环境建议 | 你的应用 URL（如 `https://your-app.vercel.app`） |
| `GITHUB_CLIENT_ID` | ✅ 如果使用 GitHub 登录 | GitHub OAuth App ID |
| `GITHUB_CLIENT_SECRET` | ✅ 如果使用 GitHub 登录 | GitHub OAuth App Secret |

**获取本地环境变量：**
```bash
# 查看 .env 文件
cat .env

# 或者使用 PowerShell
Get-Content .env
```

**复制到 Vercel：**
对于每个环境变量：
1. 从 `.env` 文件中复制值
2. 在 Vercel 设置中添加
3. 选择所有环境（Production, Preview, Development）

---

## 🔧 故障排查流程图

```
本地数据库测试
      ↓
   ✅ 通过
      ↓
登录 Vercel CLI
      ↓
检查环境变量
      ↓
   ❓ DATABASE_URL 是否存在？
      ↓
    NO → 添加环境变量 → 重新部署
      ↓
   YES → 访问 /api/test-db
      ↓
   ❓ 测试通过？
      ↓
   YES → 检查应用代码逻辑
      |   → 确认数据保存到数据库而非仅 localStorage
      |   → 添加日志追踪数据保存流程
      ↓
    NO → 查看错误信息
         → 检查连接字符串是否正确
         → 检查 Neon 数据库状态
         → 查看 Vercel Runtime Logs
```

---

## 💡 调试技巧

### 1. 添加日志记录

在关键的数据保存操作中添加日志：

```typescript
// 例如在 src/pages/api/projects/index.ts
export default async function handler(req, res) {
  if (req.method === "POST") {
    console.log("[API] 开始创建项目:", req.body);
    
    try {
      const project = await db.project.create({
        data: req.body,
      });
      
      console.log("[API] 项目创建成功:", project.id);
      res.status(200).json(project);
    } catch (error) {
      console.error("[API] 项目创建失败:", error);
      res.status(500).json({ error: "创建失败" });
    }
  }
}
```

然后在 Vercel 的 **Runtime Logs** 中查看这些日志。

### 2. 使用 Vercel CLI 查看实时日志

```bash
# 查看生产环境的实时日志
vercel logs --follow

# 或者查看特定部署的日志
vercel logs [deployment-url]
```

### 3. 测试特定的 API 端点

使用 curl 或 Postman 测试：

```bash
# 测试数据库连接
curl https://your-app.vercel.app/api/test-db

# 测试创建项目
curl -X POST https://your-app.vercel.app/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"测试项目","icon":"📝","color":"#4F46E5"}'
```

---

## 📞 下一步

1. **立即执行：**
   ```bash
   vercel login
   npx tsx scripts/check-vercel-config.ts
   ```

2. **在 Vercel 仪表板中确认环境变量**

3. **部署并测试：**
   ```bash
   vercel --prod
   ```
   
   然后访问: `https://your-app.vercel.app/api/test-db`

4. **如果测试 API 通过但应用仍有问题：**
   - 问题出在应用代码逻辑上
   - 需要检查具体的数据保存流程
   - 查看哪些操作没有正确保存数据

5. **查看详细指南：**
   - `VERCEL_DATA_PERSISTENCE_GUIDE.md` - 完整的故障排查指南
   - `PRISMA_CONNECTION_FIX.md` - Prisma 连接问题修复

---

**创建时间：** 2025-12-26  
**本地测试：** ✅ 全部通过（8/8）  
**下一步：** 检查 Vercel 环境变量配置

