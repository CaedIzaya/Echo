# 🚀 服务器部署指南 - 共享阿里云数据库

## 📋 概述

本指南帮助你将服务器上的 Echo 应用连接到同一个阿里云 PostgreSQL 数据库，实现：
- ✅ 本地开发和服务器共享同一个数据库
- ✅ 数据实时同步
- ✅ 生产环境部署

---

## 🔧 步骤 1: 配置阿里云白名单

### 获取服务器 IP 地址

**在服务器上执行**：
```bash
# 方法 1: 查看公网 IP
curl ifconfig.me

# 方法 2: 
curl ip.sb

# 方法 3:
curl ipinfo.io/ip
```

记录下你的服务器 IP，例如：`123.456.789.0`

### 添加 IP 到阿里云白名单

1. 登录阿里云 RDS 控制台：https://rdsnext.console.aliyun.com/
2. 找到实例：`pgm-bp195rs24s2476mydo`
3. 左侧菜单 → **"数据安全性"** → **"白名单设置"**
4. 点击 **"添加白名单分组"** 或编辑现有分组
5. 添加你的服务器 IP：`123.456.789.0/32`
6. 保存设置

**提示**：
- 如果是阿里云 ECS，可以添加到内网白名单
- 如果 IP 经常变动，可以添加 IP 段（不推荐生产环境）

---

## 📦 步骤 2: 在服务器上配置环境变量

### 方法 A: 使用 .env 文件（开发/测试环境）

**在服务器上**：

```bash
# 进入项目目录
cd /path/to/echo-app

# 创建 .env 文件
cat > .env << 'EOF'
# ========================================
# Echo App - 生产环境配置
# ========================================

# 数据库配置 - 阿里云 PostgreSQL
DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public"

# NextAuth.js 配置
NEXTAUTH_SECRET="Apw2acnT7u81F3mYRcHHo1bVG18sNMOlqEfhwAYpxPw="
NEXTAUTH_URL="https://你的域名.com"

# 应用配置
NODE_ENV="production"
LOG_LEVEL="info"
EOF

# 设置文件权限（安全）
chmod 600 .env
```

**重要**：将 `NEXTAUTH_URL` 改为你的实际域名！

### 方法 B: 使用系统环境变量（生产环境推荐）

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public"
export NEXTAUTH_SECRET="Apw2acnT7u81F3mYRcHHo1bVG18sNMOlqEfhwAYpxPw="
export NEXTAUTH_URL="https://你的域名.com"
export NODE_ENV="production"

# 重新加载配置
source ~/.bashrc
```

### 方法 C: 使用 PM2 生态系统文件（推荐）

```bash
# 创建 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'echo-app',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public',
      NEXTAUTH_SECRET: 'Apw2acnT7u81F3mYRcHHo1bVG18sNMOlqEfhwAYpxPw=',
      NEXTAUTH_URL: 'https://你的域名.com',
      PORT: 3000
    }
  }]
};
EOF
```

---

## 🔐 步骤 3: 安全优化（生产环境必做）

### 1. 启用 SSL 连接

修改 `DATABASE_URL`，添加 `sslmode=require`：

```env
DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public&sslmode=require"
```

### 2. 使用连接池

添加连接池参数：

```env
DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public&sslmode=require&connection_limit=10&pool_timeout=20"
```

### 3. 使用内网地址（如果服务器在阿里云）

如果你的服务器是阿里云 ECS，可以使用内网地址（更快、更安全、免费）：

```env
# 将外网地址替换为内网地址
# 外网: pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com
# 内网: 在阿里云控制台查看 "基本信息" → "内网地址"

DATABASE_URL="postgresql://echo_user:Czx2002517!@内网地址:5432/echo?schema=public"
```

### 4. 定期更换密码和密钥

**生产环境部署前**，强烈建议：

```bash
# 1. 在阿里云控制台修改 echo_user 密码
# 2. 生成新的 NEXTAUTH_SECRET
openssl rand -base64 32

# 3. 更新 .env 文件
```

---

## 🚀 步骤 4: 部署应用

### 使用 Docker（推荐）

```bash
# 1. 在项目根目录创建 Dockerfile（如果还没有）
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
EOF

# 2. 构建镜像
docker build -t echo-app .

# 3. 运行容器
docker run -d \
  --name echo-app \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public&sslmode=require" \
  -e NEXTAUTH_SECRET="Apw2acnT7u81F3mYRcHHo1bVG18sNMOlqEfhwAYpxPw=" \
  -e NEXTAUTH_URL="https://你的域名.com" \
  -e NODE_ENV="production" \
  echo-app
```

### 使用 PM2

```bash
# 1. 安装依赖
npm ci --only=production

# 2. 生成 Prisma Client
npx prisma generate

# 3. 构建应用
npm run build

# 4. 使用 PM2 启动
pm2 start ecosystem.config.js

# 5. 设置开机自启
pm2 startup
pm2 save
```

### 使用 Vercel（最简单）

如果使用 Vercel 部署：

1. 在 Vercel 项目设置中添加环境变量：
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

2. 推送代码自动部署

---

## ✅ 步骤 5: 验证连接

### 在服务器上测试数据库连接

```bash
# 方法 1: 使用 psql（如果已安装）
psql "postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo" -c "SELECT version();"

# 方法 2: 使用 Node.js 脚本
node << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.$queryRaw`SELECT current_database(), current_user`
  .then(result => {
    console.log('✅ 数据库连接成功:', result);
    return prisma.$disconnect();
  })
  .catch(err => {
    console.error('❌ 连接失败:', err.message);
    process.exit(1);
  });
EOF
```

### 访问应用测试

```bash
# 1. 启动应用
npm start

# 2. 在浏览器访问
# http://服务器IP:3000
# 或 https://你的域名.com

# 3. 测试功能
# - 注册新用户
# - 创建项目
# - 开始专注会话
```

---

## 🎯 高级配置

### 1. 读写分离（大流量场景）

如果阿里云配置了只读实例：

```env
# 主库（写入）
DATABASE_URL="postgresql://echo_user:密码@主库地址:5432/echo?schema=public"

# 只读副本（读取）
DATABASE_READ_URL="postgresql://echo_user:密码@只读地址:5432/echo?schema=public"
```

### 2. 连接池优化

根据服务器性能调整：

```env
# 小型服务器 (1-2 核)
connection_limit=5

# 中型服务器 (4-8 核)
connection_limit=10

# 大型服务器 (8+ 核)
connection_limit=20
```

### 3. 数据库监控

在阿里云控制台启用：
- CPU 监控告警
- 连接数告警
- 慢查询日志

---

## 🐛 常见问题

### 问题 1: 连接超时

**原因**: 白名单未配置或网络问题

**解决**:
```bash
# 测试网络连通性
nc -zv pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com 5432

# 或
telnet pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com 5432
```

### 问题 2: SSL 连接失败

**解决**: 从阿里云下载 SSL 证书或移除 `sslmode=require`

### 问题 3: 连接数过多

**原因**: 连接池配置不当

**解决**:
```bash
# 查看当前连接数
psql "..." -c "SELECT count(*) FROM pg_stat_activity;"

# 调整连接池大小
# 在 DATABASE_URL 中减小 connection_limit
```

---

## 📊 数据同步说明

### 自动同步

- ✅ 本地和服务器**自动共享**同一个数据库
- ✅ 在本地创建的用户，服务器上也能看到
- ✅ 在服务器上的操作，本地也能看到
- ✅ **实时同步**，无需手动操作

### Schema 更新

如果修改了 Prisma Schema（例如添加新表）：

```bash
# 在本地开发环境
npx prisma db push

# 在服务器上（只需要重新生成 Client）
npx prisma generate
pm2 restart echo-app
```

---

## 🔒 安全检查清单

部署前确认：

- [ ] 已修改默认密码
- [ ] 已生成新的 NEXTAUTH_SECRET
- [ ] 已配置白名单（只允许必要的 IP）
- [ ] 已启用 SSL 连接
- [ ] 已设置 .env 文件权限（600）
- [ ] 已配置防火墙规则
- [ ] 已启用阿里云 RDS 自动备份
- [ ] 已配置监控告警

---

## 📝 快速命令参考

```bash
# 测试连接
psql "$DATABASE_URL" -c "SELECT 1"

# 查看数据库大小
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('echo'));"

# 查看连接数
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname='echo';"

# 查看慢查询
# 在阿里云控制台: 日志管理 → 慢日志明细

# 备份数据库
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql "$DATABASE_URL" < backup_20251229.sql
```

---

## 🎉 完成

现在你的服务器和本地开发环境已经连接到同一个阿里云 PostgreSQL 数据库了！

**测试步骤**：
1. 在本地注册一个用户 `test@example.com`
2. 在服务器上登录同一个用户
3. 验证数据同步成功 ✅

---

**需要帮助？** 

遇到问题时检查：
1. 阿里云白名单是否包含服务器 IP
2. DATABASE_URL 是否正确
3. 网络连接是否正常
4. 服务器防火墙是否允许出站 5432 端口

---

**创建时间**: 2025-12-29  
**适用版本**: Echo App v0.1.0

