# Vercel 数据持久化问题诊断指南

## 🎯 问题概述

如果你的应用在 Vercel 上出现数据不保存的问题，可能的原因有：

1. **环境变量配置不正确** - Vercel 上的 `DATABASE_URL` 未设置或错误
2. **数据库连接问题** - 网络、防火墙或 Neon 服务问题
3. **Prisma Client 未正确生成** - 构建时 Prisma 生成失败
4. **应用代码逻辑问题** - 数据保存逻辑有 bug

## 🔍 诊断步骤

### 步骤 1: 测试本地数据库连接

首先确认本地能正常连接数据库：

```bash
npx tsx scripts/test-db-connection.ts
```

**期望结果：** 所有 8 个测试都应该通过 ✅

**如果失败：**
- 检查 `.env` 文件中的 `DATABASE_URL` 是否正确
- 检查网络连接
- 检查 Neon 数据库是否在运行（登录 Neon 控制台查看）

---

### 步骤 2: 检查 Vercel 配置

```bash
npx tsx scripts/check-vercel-config.ts
```

这个脚本会检查：
- Vercel CLI 是否安装
- 是否已登录 Vercel
- 项目是否链接到 Vercel
- 环境变量是否正确设置
- Prisma Client 是否已生成

**如果发现问题，按照建议进行修复。**

---

### 步骤 3: 检查 Vercel 环境变量

登录 [Vercel 仪表板](https://vercel.com/dashboard)：

1. 选择你的项目
2. 进入 **Settings** → **Environment Variables**
3. 确认以下变量已设置：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://neondb_owner:...@...neon.tech/neondb?...` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | 你的密钥 | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |
| `GITHUB_CLIENT_ID` | 你的 GitHub OAuth ID | Production, Preview, Development |
| `GITHUB_CLIENT_SECRET` | 你的 GitHub OAuth Secret | Production, Preview, Development |

**重要：** 
- `DATABASE_URL` 必须使用 Neon 的 **pooler** 端点（包含 `-pooler`）
- 设置环境变量后需要**重新部署**应用

---

### 步骤 4: 检查 Vercel 部署日志

1. 在 Vercel 仪表板中，点击最新的部署
2. 查看 **Build Logs**
3. 搜索关键词：
   - `prisma generate` - 应该成功
   - `error` - 查看是否有错误
   - `DATABASE_URL` - 检查是否被识别

**常见问题：**
- ❌ `prisma generate` 失败 → 检查 `package.json` 中的 `postinstall` 脚本
- ❌ 环境变量未加载 → 重新设置并重新部署
- ❌ 数据库连接超时 → 检查 Neon 数据库状态

---

### 步骤 5: 测试 Vercel 上的数据库连接

创建一个测试 API 路由来验证连接：

**文件：** `src/pages/api/test-db.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 测试连接
    await db.$queryRaw`SELECT 1`;
    
    // 测试查询
    const userCount = await db.user.count();
    
    // 测试写入
    const testId = `test_${Date.now()}`;
    const user = await db.user.create({
      data: {
        id: testId,
        email: `test_${Date.now()}@test.com`,
        name: "Test User",
      },
    });
    
    // 清理
    await db.user.delete({ where: { id: testId } });
    
    res.status(200).json({
      success: true,
      message: "数据库连接正常",
      userCount,
      testResult: "写入和删除成功",
    });
  } catch (error) {
    console.error("数据库测试失败:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
      details: error,
    });
  }
}
```

**部署后访问：** `https://your-app.vercel.app/api/test-db`

**期望结果：**
```json
{
  "success": true,
  "message": "数据库连接正常",
  "userCount": 10,
  "testResult": "写入和删除成功"
}
```

---

## 🛠️ 常见问题修复

### 问题 1: 数据库连接错误

**症状：** `Error: P1001: Can't reach database server`

**解决方案：**
1. 确认 Neon 数据库正在运行（不是 suspended）
2. 检查 `DATABASE_URL` 是否正确
3. 确保使用 pooler 端点
4. 检查 Neon 的 IP 白名单设置（如果有）

---

### 问题 2: Prisma Client 未生成

**症状：** `Cannot find module '@prisma/client'`

**解决方案：**

1. 检查 `package.json` 中的 `postinstall` 脚本：
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

2. 在 Vercel 项目设置中添加构建命令：
   - **Build Command:** `npm run build`
   - **Install Command:** `npm install`

3. 确保 `prisma/schema.prisma` 文件存在并正确

---

### 问题 3: 环境变量未加载

**症状：** `DATABASE_URL is not defined`

**解决方案：**

1. 确认在 Vercel 设置中添加了环境变量
2. 选择正确的环境（Production/Preview/Development）
3. 重新部署应用（环境变量更改后必须重新部署）
4. 检查 `.env.example` 和实际 `.env` 的差异

---

### 问题 4: 数据写入但不持久化

**症状：** 数据写入成功但刷新后消失

**可能原因：**

1. **使用了 localStorage 而不是数据库**
   - 检查代码中是否正确使用了 `db.model.create()` 等方法
   - 确认没有仅依赖前端存储

2. **事务回滚**
   - 检查是否有未捕获的错误导致事务回滚
   - 添加日志记录来追踪数据保存流程

3. **数据库连接在写入前关闭**
   - 确保使用了连接池（pooler 端点）
   - 检查是否有连接超时设置过短

**调试方法：**

在关键的数据保存操作中添加日志：

```typescript
try {
  console.log("[DB] 开始保存数据:", data);
  const result = await db.model.create({ data });
  console.log("[DB] 保存成功:", result);
  return result;
} catch (error) {
  console.error("[DB] 保存失败:", error);
  throw error;
}
```

在 Vercel 的 **Runtime Logs** 中查看这些日志。

---

### 问题 5: Neon 数据库自动暂停

**症状：** 一段时间不用后，首次访问很慢或失败

**原因：** Neon 免费版会在闲置 5 分钟后自动暂停

**解决方案：**

1. **使用 pooler 端点** - 已在 `.env` 中配置
2. **添加连接重试** - 已在 `src/server/db.ts` 中实现
3. **定期心跳检查** - 已在 `src/server/db.ts` 中实现
4. **升级到 Neon 付费版** - 获得更好的性能和可用性

---

## 📊 诊断清单

使用此清单逐项检查：

- [ ] 本地数据库连接测试通过
- [ ] Vercel 环境变量已正确设置
- [ ] Vercel 部署日志无错误
- [ ] `prisma generate` 在构建时成功执行
- [ ] 测试 API 路由返回成功
- [ ] Neon 数据库状态正常（未 suspended）
- [ ] 使用了 pooler 端点
- [ ] 代码中正确使用了数据库操作
- [ ] 添加了错误处理和日志记录

---

## 🚀 优化建议

### 1. 使用连接池

确保 `DATABASE_URL` 包含连接池参数：
```
postgresql://...?sslmode=require&connection_limit=5&pool_timeout=10&connect_timeout=10&statement_cache_size=0&pgbouncer=true
```

### 2. 添加数据库监控

在 Vercel 中启用日志记录：
- 进入项目设置 → **Logs**
- 启用 Runtime Logs
- 监控数据库操作日志

### 3. 实现数据同步机制

如果使用了前端存储（localStorage），确保：
- 用户登录时从数据库加载数据
- 用户操作时同步保存到数据库
- 定期同步以防止数据丢失

### 4. 错误追踪

集成错误追踪服务（如 Sentry）：
```bash
npm install @sentry/nextjs
```

这样可以更好地追踪生产环境中的错误。

---

## 📞 需要帮助？

如果按照上述步骤仍无法解决问题：

1. 运行诊断脚本并保存输出：
   ```bash
   npx tsx scripts/test-db-connection.ts > db-test-result.txt
   npx tsx scripts/check-vercel-config.ts > vercel-config-result.txt
   ```

2. 导出 Vercel 部署日志

3. 检查 Neon 数据库日志：
   - 登录 Neon 控制台
   - 查看 **Operations** 或 **Logs** 标签

4. 在项目中搜索所有数据库写入操作：
   ```bash
   grep -r "\.create(" src/
   grep -r "\.update(" src/
   ```

5. 确认这些操作都有适当的错误处理

---

**最后更新：** 2025-12-26  
**相关文档：** `PRISMA_CONNECTION_FIX.md`, `DATABASE_DIAGNOSTIC_REPORT.md`

