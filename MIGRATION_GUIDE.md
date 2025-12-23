# 数据库迁移指南：SQLite → PostgreSQL (NeonDB)

## ✅ 已完成的修改

1. ✅ `prisma/schema.prisma` - 已从 SQLite 切换为 PostgreSQL
2. ✅ `src/pages/api/auth/forgot.ts` - 已修复数据库错误时的提示信息

## 📋 迁移步骤

### 步骤 1：注册并创建 NeonDB 数据库

1. 访问 https://neon.tech 并注册账号
2. 创建新项目
3. 创建数据库后，复制连接字符串（格式类似：`postgresql://user:password@host/dbname?sslmode=require`）

### 步骤 2：配置 Vercel 环境变量

1. 登录 Vercel Dashboard
2. 进入你的项目设置 → Environment Variables
3. 添加环境变量：
   - **变量名**: `DATABASE_URL`
   - **值**: NeonDB 的连接字符串
   - **环境**: Production, Preview, Development（全选）

### 步骤 3：本地迁移数据库（可选，用于测试）

如果你想在本地先测试：

1. 创建 `.env.local` 文件（如果还没有）：
   ```bash
   DATABASE_URL="你的NeonDB连接字符串"
   ```

2. 生成 Prisma Client：
   ```bash
   npm run postinstall
   # 或
   npx prisma generate
   ```

3. 推送数据库结构到 NeonDB：
   ```bash
   npm run db:push
   # 或
   npx prisma db push
   ```

### 步骤 4：在 Vercel 上部署

1. 推送代码到 Git 仓库（如果还没推送）
2. Vercel 会自动检测到代码变更并重新部署
3. 部署时，Vercel 会运行 `postinstall` 脚本（自动执行 `prisma generate`）

### 步骤 5：在 Vercel 上初始化数据库结构

部署完成后，需要在 Vercel 上运行数据库迁移：

**方法 A：使用 Vercel CLI（推荐）**
```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 登录
vercel login

# 链接项目
vercel link

# 运行数据库迁移
vercel env pull .env.local  # 拉取环境变量到本地
npx prisma db push  # 推送数据库结构
```

**方法 B：使用 Vercel Dashboard**
1. 进入项目 → Settings → Functions
2. 创建一个临时 API 路由来执行迁移（不推荐，但可行）

**方法 C：使用 NeonDB Dashboard**
1. 登录 NeonDB Dashboard
2. 进入你的数据库
3. 使用 SQL Editor 手动执行 Prisma 生成的 SQL（复杂，不推荐）

### 步骤 6：验证迁移

1. 访问你的 Vercel 部署地址
2. 尝试登录（应该可以正常工作了）
3. 尝试忘记密码功能（应该显示"联系管理员"而不是"找回密码失败"）

## ⚠️ 重要提示

1. **数据迁移**：如果你的 SQLite 数据库中有重要数据，需要手动迁移：
   - 导出 SQLite 数据
   - 转换为 PostgreSQL 格式
   - 导入到 NeonDB

2. **本地开发**：如果你本地还在使用 SQLite，可以：
   - 创建 `.env.local` 使用 NeonDB（推荐）
   - 或创建 `.env.local.sqlite` 继续使用 SQLite（不推荐，会导致环境不一致）

3. **备份**：迁移前建议备份现有数据

## 🐛 故障排除

### 问题：Vercel 部署后仍然报数据库错误

**解决方案**：
- 确认 `DATABASE_URL` 环境变量已正确设置
- 确认连接字符串格式正确（必须以 `postgresql://` 开头）
- 检查 NeonDB Dashboard 确认数据库已创建

### 问题：迁移后无法登录

**解决方案**：
- 确认数据库表已正确创建（使用 `npx prisma studio` 检查）
- 确认用户数据已迁移（如果没有迁移，需要重新注册）

### 问题：Prisma Client 生成失败

**解决方案**：
```bash
# 清理并重新生成
rm -rf node_modules/.prisma
npx prisma generate
```

## 📚 相关资源

- [NeonDB 文档](https://neon.tech/docs)
- [Prisma PostgreSQL 指南](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Vercel 环境变量配置](https://vercel.com/docs/concepts/projects/environment-variables)












