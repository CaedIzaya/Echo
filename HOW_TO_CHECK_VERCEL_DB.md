# 如何检查 Vercel 上的数据库连接

## 🎉 好消息！

✅ **你的本地服务器可以完美连接 Neon PostgreSQL 数据库！**

刚刚运行的测试显示所有 8 个测试都通过了：
- 连接、查询、表结构、用户数据
- 写入、事务、并发、关联查询

这意味着你的数据库本身和连接配置都是正确的。

---

## 🔍 Vercel 数据不保存的原因分析

既然本地正常，Vercel 上的问题**最可能**是：

### 原因 1: 环境变量未设置（90% 可能性）⭐

Vercel 不会自动读取你的 `.env` 文件，需要手动配置。

---

## 📝 立即执行的 3 个步骤

### 步骤 1: 登录 Vercel CLI

```bash
vercel login
```

按照提示完成登录（会在浏览器中打开）。

---

### 步骤 2: 检查并设置环境变量

**方法 A: 使用 Vercel CLI（推荐）**

```bash
# 查看当前环境变量
vercel env ls production

# 如果没有 DATABASE_URL，添加它
vercel env add DATABASE_URL production
```

然后输入数据库连接字符串（从 `.env` 文件中复制）：
```
postgresql://neondb_owner:npg_kP6zLD3wjVGp@ep-flat-river-a4zkii5n-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=10&connect_timeout=10&statement_cache_size=0&pgbouncer=true
```

**重复添加到 preview 和 development 环境：**
```bash
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development
```

---

**方法 B: 使用 Vercel 仪表板（更简单）**

1. 打开 https://vercel.com/dashboard
2. 选择你的项目（t3-app）
3. 进入 **Settings** → **Environment Variables**
4. 点击 **Add New**
5. 填写：
   - **Name:** `DATABASE_URL`
   - **Value:** 从你的 `.env` 文件复制整个连接字符串
   - **Environment:** 勾选 **Production**, **Preview**, **Development**（全选）
6. 点击 **Save**

**同样添加其他必需的环境变量：**
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`（值为 `https://your-app.vercel.app`）
- `GITHUB_CLIENT_ID`（如果使用 GitHub 登录）
- `GITHUB_CLIENT_SECRET`（如果使用 GitHub 登录）

---

### 步骤 3: 重新部署应用

**⚠️ 重要：** 修改环境变量后必须重新部署！

**方法 A: 使用 CLI**
```bash
vercel --prod
```

**方法 B: 在 Vercel 仪表板中**
1. 进入 **Deployments** 标签
2. 找到最新的部署
3. 点击右侧的 "..." 菜单
4. 选择 **Redeploy**
5. 确认重新部署

---

## 🧪 测试 Vercel 上的数据库

部署完成后，访问测试 API：

```
https://your-app.vercel.app/api/test-db
```

**如果看到这样的响应，说明成功了：**
```json
{
  "success": true,
  "environment": {
    "hasDatabaseUrl": true,
    "databaseType": "Neon PostgreSQL",
    "isPooler": true
  },
  "tests": {
    "connection": { "passed": true },
    "simpleQuery": { "passed": true },
    "tableCount": { "passed": true },
    "userCount": { "passed": true },
    "writeTest": { "passed": true }
  }
}
```

**如果失败，查看错误信息并参考下面的故障排查。**

---

## 🔧 快速故障排查

### 问题：API 返回 500 错误

**检查：**
```bash
# 查看实时日志
vercel logs --follow
```

**常见错误和解决方案：**

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `DATABASE_URL is not defined` | 环境变量未设置 | 按步骤 2 添加环境变量并重新部署 |
| `Cannot find module '@prisma/client'` | Prisma Client 未生成 | 检查 `package.json` 中的 `postinstall` 脚本 |
| `P1001: Can't reach database` | 无法连接数据库 | 检查 Neon 数据库状态，确认连接字符串正确 |
| `P1017: Server has closed` | 连接关闭 | 已修复，重新部署即可 |

---

### 问题：环境变量设置了但还是不工作

**可能原因：**
1. 设置后没有重新部署
2. 只设置了某个环境，没有全选
3. 连接字符串复制错误（有多余空格或缺少部分）

**解决方案：**
```bash
# 验证环境变量
vercel env ls production

# 如果值不对，先删除再重新添加
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production

# 然后重新部署
vercel --prod
```

---

## 📚 完整文档参考

我创建了几个详细的文档来帮助你：

1. **VERCEL_DATABASE_CHECKLIST.md** - 完整检查清单（最推荐阅读）
2. **VERCEL_DATA_PERSISTENCE_GUIDE.md** - 详细的故障排查指南
3. **PRISMA_CONNECTION_FIX.md** - Prisma 连接错误修复（已应用）

### 可用的测试脚本

```bash
# 测试本地数据库连接（已通过 ✅）
npx tsx scripts/test-db-connection.ts

# 检查 Vercel 配置（需要先 vercel login）
npx tsx scripts/check-vercel-config.ts
```

---

## 🎯 关键要点

1. ✅ **本地数据库连接正常** - 问题不在数据库或网络
2. ⚠️ **需要在 Vercel 设置环境变量** - 这是最可能的问题
3. 🔄 **设置后必须重新部署** - 环境变量修改不会自动生效
4. 🧪 **使用测试 API 验证** - 部署后访问 `/api/test-db`

---

## 💡 快速命令参考

```bash
# 登录 Vercel
vercel login

# 查看环境变量
vercel env ls production

# 添加环境变量
vercel env add DATABASE_URL production

# 重新部署
vercel --prod

# 查看日志
vercel logs --follow

# 本地测试（再次运行）
npx tsx scripts/test-db-connection.ts
```

---

## ✨ 预期结果

完成上述步骤后：

1. ✅ Vercel 上的环境变量正确配置
2. ✅ `/api/test-db` 返回成功响应
3. ✅ 应用可以正确保存和读取数据
4. ✅ 不再出现数据丢失问题

---

## 🆘 如果还有问题

如果按照上述步骤操作后仍然有问题：

1. 运行完整检查：
   ```bash
   vercel login
   npx tsx scripts/check-vercel-config.ts
   ```

2. 检查 Vercel 部署日志中的错误
3. 查看 Neon 数据库控制台确认数据库正常运行
4. 参考 `VERCEL_DATA_PERSISTENCE_GUIDE.md` 进行深入排查

---

**祝你成功！** 🚀

如果测试 API 通过，你的 Vercel 应用就可以正常保存数据了。

