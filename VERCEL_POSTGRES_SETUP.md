# 连接 Vercel Postgres 数据库指南

## 步骤 1: 在 Vercel 上创建 Postgres 数据库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目，或者创建一个新项目
3. 点击项目设置中的 **Storage** 标签
4. 点击 **Create Database** 并选择 **Postgres**
5. 选择数据库计划（Hobby 免费计划即可用于开发）
6. 创建数据库后，Vercel 会自动在你的项目中添加环境变量

## 步骤 2: 获取数据库连接字符串

在 Vercel Dashboard 中：

1. 进入你的项目
2. 点击 **Settings** → **Environment Variables**
3. 找到 `POSTGRES_URL` 或 `DATABASE_URL` 环境变量
4. 复制连接字符串

或者：

1. 在 Storage 标签中找到你的 Postgres 数据库
2. 点击数据库名称进入详情页
3. 在 **Connection String** 部分找到连接字符串

连接字符串格式类似：
```
postgresql://default:password@host.vercel-storage.com:5432/verceldb?sslmode=require
```

## 步骤 3: 配置本地环境变量

更新你的 `.env` 文件：

```env
DATABASE_URL="你的_Vercel_Postgres_连接字符串"
```

**重要**: 确保连接字符串包含 `?sslmode=require` 参数（Vercel Postgres 需要 SSL 连接）

## 步骤 4: 安装 PostgreSQL 客户端（如果需要）

如果你还没有安装 PostgreSQL 客户端，可能需要安装：

```bash
npm install pg
```

或者使用 Prisma 自带的客户端（通常不需要额外安装）

## 步骤 5: 运行数据库迁移

### 生成 Prisma Client

```bash
npm run db:generate
# 或者
npx prisma generate
```

### 推送数据库架构到 Vercel Postgres

```bash
npm run db:push
# 或者
npx prisma db push
```

### 或者使用迁移（推荐用于生产环境）

```bash
# 创建迁移
npx prisma migrate dev --name init

# 部署迁移（在 Vercel 部署时自动运行）
npm run db:migrate
```

## 步骤 6: 在 Vercel 上配置环境变量

在 Vercel Dashboard 中：

1. 进入项目 **Settings** → **Environment Variables**
2. 确保 `DATABASE_URL` 环境变量已设置（Vercel 通常在创建 Postgres 数据库时自动添加）
3. 对于生产、预览和开发环境，确保都设置了正确的值

## 步骤 7: 验证连接

### 本地验证

```bash
# 启动开发服务器
npm run dev

# 或者使用 Prisma Studio 查看数据库
npx prisma studio
```

### 检查数据库连接

确保你的应用能够正常连接数据库。如果遇到连接问题，检查：

1. 连接字符串是否正确
2. 是否包含 `sslmode=require`
3. 数据库是否在 Vercel 上正常运行
4. 环境变量是否正确设置

## 常见问题

### 问题 1: 连接超时
- 确保连接字符串包含 `sslmode=require`
- 检查防火墙设置
- 确认数据库在 Vercel 上处于活跃状态

### 问题 2: 迁移失败
- 如果从 SQLite 迁移，数据不会自动迁移，需要手动迁移数据
- 确保数据库架构与 Prisma schema 匹配

### 问题 3: 环境变量未生效
- 在 Vercel Dashboard 中检查环境变量设置
- 重新部署应用以应用新的环境变量

## 注意事项

⚠️ **重要提醒**:
- SQLite 和 PostgreSQL 的数据类型和行为有差异
- 如果你已有 SQLite 数据，需要手动迁移数据到 PostgreSQL
- 确保 `.env` 文件已添加到 `.gitignore`（不要提交敏感信息）
- 在生产环境中，始终使用环境变量而不是硬编码连接字符串

## 下一步

配置完成后，你的应用将使用 Vercel Postgres 数据库。确保：

1. ✅ 本地 `.env` 文件已配置
2. ✅ Vercel Dashboard 中的环境变量已设置
3. ✅ 数据库迁移已成功运行
4. ✅ 应用可以正常连接数据库

祝你使用愉快！🎉

















