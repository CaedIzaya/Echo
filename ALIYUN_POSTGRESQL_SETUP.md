# 阿里云 PostgreSQL 接入指南

## 📋 准备工作

在开始之前，请确保你已经：

1. ✅ 在阿里云创建了 PostgreSQL 实例
2. ✅ 获取了数据库连接信息（主机地址、端口、用户名、密码）
3. ✅ 配置了白名单（允许你的 IP 访问）

---

## 🔧 接入步骤

### 步骤 1：获取阿里云 PostgreSQL 连接信息

登录阿里云控制台，找到你的 PostgreSQL 实例，获取以下信息：

- **主机地址**: `rm-xxxxx.pg.rds.aliyuncs.com`（内网）或 `rm-xxxxx.pg.rds.aliyuncs.com`（外网）
- **端口**: 通常是 `5432`
- **数据库名**: 例如 `echo_db`
- **用户名**: 例如 `echo_user`
- **密码**: 你设置的密码

### 步骤 2：配置环境变量

1. 复制 `.env.example` 为 `.env`：
   ```bash
   copy .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的数据库连接信息：
   ```env
   DATABASE_URL="postgresql://用户名:密码@主机地址:5432/数据库名?schema=public"
   ```

   **示例**：
   ```env
   DATABASE_URL="postgresql://echo_user:MyPassword123@rm-bp1xxxxx.pg.rds.aliyuncs.com:5432/echo_db?schema=public"
   ```

3. 生成 NextAuth 密钥：
   ```bash
   # Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   
   # 或使用在线工具: https://generate-secret.vercel.app/32
   ```

   将生成的密钥填入 `.env`：
   ```env
   NEXTAUTH_SECRET="your-generated-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

### 步骤 3：测试数据库连接

运行测试脚本验证连接：

```bash
npm run db:health-check
```

如果连接成功，你会看到：
```
✅ 数据库连接成功
✅ 数据库版本: PostgreSQL 14.x
```

### 步骤 4：运行数据库迁移

将 Prisma schema 同步到阿里云数据库：

```bash
# 生成 Prisma Client
npx prisma generate

# 推送 schema 到数据库（开发环境）
npx prisma db push

# 或使用迁移（生产环境推荐）
npx prisma migrate deploy
```

### 步骤 5：验证数据库表

使用 Prisma Studio 查看数据库：

```bash
npm run db:studio
```

浏览器会自动打开 `http://localhost:5555`，你可以看到所有的表和数据。

---

## 🔒 安全配置建议

### 1. 白名单配置

在阿里云 RDS 控制台配置白名单：

- **开发环境**: 添加你的本地 IP 地址
- **生产环境**: 添加 Vercel/服务器的出口 IP

### 2. SSL 连接（推荐）

启用 SSL 加密连接：

```env
DATABASE_URL="postgresql://用户名:密码@主机地址:5432/数据库名?schema=public&sslmode=require"
```

### 3. 连接池配置

对于生产环境，建议配置连接池：

```env
DATABASE_URL="postgresql://用户名:密码@主机地址:5432/数据库名?schema=public&connection_limit=10&pool_timeout=20"
```

参数说明：
- `connection_limit`: 最大连接数（建议 5-10）
- `pool_timeout`: 连接超时时间（秒）

---

## 🚀 性能优化

### 1. 使用内网地址

如果你的应用部署在阿里云 ECS 上，使用内网地址可以获得更好的性能和更低的延迟。

### 2. 配置 Prisma 连接池

在 `prisma/schema.prisma` 中已经配置了 PostgreSQL，无需额外修改。

### 3. 索引优化

当前 schema 已经包含了必要的索引：
- 用户表：`email`, `createdAt`
- 项目表：`userId + isPrimary`, `userId + isActive`
- 专注记录：`userId + startTime`, `userId + createdAt`
- 每日总结：`userId + date`

---

## 🐛 常见问题

### 问题 1: 连接超时

**原因**: 白名单未配置或 IP 地址不正确

**解决**:
1. 检查阿里云 RDS 白名单配置
2. 确认你的公网 IP（访问 https://ip.sb）
3. 添加 IP 到白名单

### 问题 2: 认证失败

**原因**: 用户名或密码错误

**解决**:
1. 检查 `.env` 中的用户名和密码
2. 确保密码中的特殊字符已正确编码（如 `@` 应写为 `%40`）

### 问题 3: SSL 连接失败

**原因**: 数据库未启用 SSL 或证书问题

**解决**:
1. 移除 `sslmode=require` 参数
2. 或从阿里云下载 SSL 证书并配置

---

## 📊 监控和维护

### 查看连接状态

```sql
SELECT * FROM pg_stat_activity WHERE datname = 'echo_db';
```

### 查看数据库大小

```sql
SELECT pg_size_pretty(pg_database_size('echo_db'));
```

### 备份建议

1. 启用阿里云 RDS 自动备份
2. 设置备份保留期（建议 7 天以上）
3. 定期测试恢复流程

---

## 🎯 下一步

数据库配置完成后：

1. ✅ 重启开发服务器：`npm run dev`
2. ✅ 测试用户注册和登录功能
3. ✅ 验证数据持久化
4. ✅ 部署到生产环境

---

## 📞 需要帮助？

如果遇到问题，请检查：

1. 数据库连接字符串格式是否正确
2. 白名单配置是否包含你的 IP
3. 数据库用户权限是否足够
4. 网络连接是否正常

---

**最后更新**: 2025-12-29
**适用版本**: Echo App v0.1.0

