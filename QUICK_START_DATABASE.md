# 🚀 阿里云 PostgreSQL 快速接入

## 一键配置（推荐）

```powershell
# 运行自动化配置脚本
.\setup-database.ps1
```

脚本会引导你输入：
- 数据库主机地址
- 端口（默认 5432）
- 数据库名
- 用户名
- 密码

然后自动：
- ✅ 生成 NextAuth 密钥
- ✅ 创建 `.env` 文件
- ✅ 测试数据库连接

---

## 手动配置

### 1. 创建 .env 文件

```bash
copy .env.example .env
```

### 2. 编辑 .env

```env
DATABASE_URL="postgresql://用户名:密码@主机地址:5432/数据库名?schema=public"
NEXTAUTH_SECRET="生成的密钥"
NEXTAUTH_URL="http://localhost:3000"
```

**生成密钥**:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. 测试连接

```bash
npm run db:health-check
```

### 4. 运行迁移

```bash
npx prisma db push
```

### 5. 启动应用

```bash
npm run dev
```

---

## 常见问题

### ❌ 连接超时
→ 检查阿里云白名单配置

### ❌ 认证失败
→ 检查用户名和密码

### ❌ SSL 错误
→ 添加 `?sslmode=require` 到连接字符串

---

## 需要帮助？

查看详细文档：`ALIYUN_POSTGRESQL_SETUP.md`

---

**准备好了吗？运行 `.\setup-database.ps1` 开始吧！** 🎉

