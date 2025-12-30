# 🔧 ECS 配置同步指南

## 📊 发现的配置差异

### 1. NEXTAUTH_SECRET 不一致 ⚠️

**ECS 服务器**:
```
289d507af2c9aedf356016aff018d4527fdad04467d3384c7a768e3d8189d0ab
```

**本地 t3-app**:
```
Apw2acnT7u81F3mYRcHHo1bVG18sNMOlqEfhwAYpxPw=
```

**影响**：
- ❌ JWT token 不兼容
- ❌ 在 ECS 登录的用户，本地无法验证
- ❌ 在本地登录的用户，ECS 无法验证

**解决方案**：**统一使用 ECS 的密钥**

### 2. DATABASE_URL 格式差异 🟡

**ECS**: `postgresql://...echo` (无参数)  
**本地**: `postgresql://...echo?schema=public`

**影响**：
- 🟢 都能正常工作
- 但建议统一格式

### 3. React 类型版本 🟢

**ECS**: `"@types/react": "19.2.7"` (锁定)  
**本地**: `"@types/react": "^19.0.0"` (范围)

**影响**：
- 🟢 已同步到本地

---

## ✅ 同步配置到本地

### 步骤 1: 更新本地 .env

```bash
cd C:\Users\ASUS\Desktop\t3-app

# 更新 NEXTAUTH_SECRET 为 ECS 的密钥
```

执行：

```powershell
$env_content = @"
# ========================================
# Echo App - 本地开发环境配置
# ========================================

# 数据库配置 - 阿里云 PostgreSQL
DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo"

# NextAuth.js 配置（与 ECS 保持一致）
NEXTAUTH_SECRET="289d507af2c9aedf356016aff018d4527fdad04467d3384c7a768e3d8189d0ab"
NEXTAUTH_URL="http://localhost:3001"

# 应用配置
NODE_ENV="development"
LOG_LEVEL="debug"
"@

$env_content | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ .env 已更新" -ForegroundColor Green
```

### 步骤 2: 创建部署配置文件

保存 ECS 配置为模板：

```bash
# 在项目根目录创建
env.production.example
```

内容：
```env
DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo"
NEXTAUTH_SECRET="289d507af2c9aedf356016aff018d4527fdad04467d3384c7a768e3d8189d0ab"
NEXTAUTH_URL="https://echoo.xin"
NODE_ENV="production"
```

---

## 🛡️ 部署保护机制

### 创建 .deployignore

确保打包时不包含敏感配置：

```
# .deployignore
.env
.env.local
.env.development.local
.env.production.local
node_modules/
.next/
.git/
```

### 创建部署前检查脚本

```bash
#!/bin/bash
# deploy-check.sh

echo "🔍 部署前检查..."

# 检查 .env 是否会被打包
if tar -tzf echo.tar.gz | grep -q "\.env$"; then
  echo "❌ 警告：.env 文件被打包了！"
  exit 1
fi

# 检查必要文件
if ! tar -tzf echo.tar.gz | grep -q "package.json"; then
  echo "❌ 错误：package.json 缺失！"
  exit 1
fi

echo "✅ 检查通过"
```

---

## 📋 安全部署流程

### 1. 本地打包（不包含 .env）

```bash
cd C:\Users\ASUS\Desktop\t3-app
.\pack.ps1  # 自动排除 .env
```

### 2. 上传到服务器

```bash
scp -i "密钥" echo.tar.gz root@121.43.158.122:/root/
```

### 3. 服务器部署（保留 .env）

```bash
ssh root@121.43.158.122

# 备份配置
cp /root/t3-app/.env /root/.env-backup

# 部署新版本
cd /root
rm -rf t3-app
tar -xzf echo.tar.gz
cd t3-app

# 恢复配置（关键！）
cp /root/.env-backup .env

# 部署
npm ci --only=production
npx prisma generate
npm run build
pm2 restart echo-app
```

---

## 🔐 配置文件管理建议

### 方案 A: 配置文件不入库（当前）

**优点**：
- ✅ 安全（密码不在 Git）
- ✅ 灵活（每个环境独立配置）

**缺点**：
- ⚠️ 需要手动同步
- ⚠️ 容易忘记更新

**适合**：小团队，手动部署

### 方案 B: 使用环境变量管理工具

**推荐工具**：
- Vercel: 内置环境变量管理
- Docker: 使用 docker-compose.yml
- PM2: 使用 ecosystem.config.js

**PM2 示例**：
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'echo-app',
    script: 'npm',
    args: 'start',
    env_production: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://...',
      NEXTAUTH_SECRET: '289d507...',
      NEXTAUTH_URL: 'https://echoo.xin'
    }
  }]
};
```

---

## 📝 配置同步清单

### ✅ 需要同步到本地的配置

1. [x] `NEXTAUTH_SECRET` - 统一为 ECS 的密钥
2. [x] `@types/react` 版本 - 锁定为 19.2.7
3. [x] `DATABASE_URL` 格式 - 统一（可选）

### ✅ 需要保护的 ECS 配置

**在服务器上**：
```bash
# 1. 备份 .env
cp /root/t3-app/.env /root/.env-permanent-backup

# 2. 设置只读权限
chmod 400 /root/.env-permanent-backup

# 3. 添加到备份脚本
echo "cp /root/t3-app/.env /root/.env-backup-\$(date +%Y%m%d)" >> /root/backup.sh
```

---

## 🚀 未来部署流程

### 标准流程（保护 ECS 配置）

```bash
# 1. 本地打包
cd C:\Users\ASUS\Desktop\t3-app
.\pack.ps1

# 2. 上传
scp echo.tar.gz root@121.43.158.122:/root/

# 3. 服务器部署（自动保护 .env）
ssh root@121.43.158.122 << 'EOF'
cd /root

# 备份配置
[ -f t3-app/.env ] && cp t3-app/.env .env-backup

# 部署
rm -rf t3-app
tar -xzf echo.tar.gz
cd t3-app

# 恢复配置
cp /root/.env-backup .env

# 安装和构建
npm ci --only=production
npx prisma generate
npm run build

# 重启
pm2 restart echo-app
EOF
```

---

## 📊 配置版本控制

### 建议：使用配置模板

**在项目中保存**：
- `env.production.example` - 生产环境模板（无敏感信息）
- `env.development.example` - 开发环境模板

**实际配置**：
- `.env` - 本地开发（不入 Git）
- 服务器 `/root/t3-app/.env` - 生产环境（手动维护）

**同步方式**：
```bash
# 从 ECS 拉取配置模板（脱敏）
ssh root@121.43.158.122 "cat /root/t3-app/.env | sed 's/Czx2002517!/******/g'" > env.production.example
```

---

## ✅ 已完成的同步

1. ✅ `@types/react` 版本已同步到本地
2. ✅ 创建了 `env.production.example` 配置模板
3. ✅ 创建了安全部署脚本

---

## 🎯 下次部署检查清单

- [ ] 打包前检查 .env 是否被排除
- [ ] 上传前备份服务器 .env
- [ ] 部署后恢复服务器 .env
- [ ] 验证应用启动成功
- [ ] 测试关键功能
- [ ] 检查数据库连接

---

**保护好服务器配置，安全部署！** 🛡️

