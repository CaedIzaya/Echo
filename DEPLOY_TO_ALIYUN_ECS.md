# 🚀 部署到阿里云 ECS 完整指南

## 📋 前提条件

- ✅ 阿里云 ECS 服务器已准备好
- ✅ 服务器已安装 Node.js (v18+)
- ✅ 服务器已配置好防火墙和安全组
- ✅ 本地已配置好项目

---

## 📦 步骤 1: 打包项目

### 在本地 Windows 执行：

```powershell
# 进入项目目录
cd C:\Users\ASUS\Desktop\t3-app

# 运行打包脚本
.\pack-for-deployment.ps1
```

**输出**: `C:\Users\ASUS\Desktop\echo-app-deploy.zip`

打包脚本会自动排除：
- `node_modules/` (会在服务器上重新安装)
- `.next/` (会在服务器上重新构建)
- `.env` (敏感信息，需要在服务器上单独创建)
- 各种缓存和临时文件

---

## 📤 步骤 2: 上传到阿里云 ECS

### 方法 A: 使用 SCP (推荐)

```powershell
# Windows PowerShell 或 CMD
scp C:\Users\ASUS\Desktop\echo-app-deploy.zip root@你的服务器IP:/root/
```

### 方法 B: 使用 WinSCP (图形界面)

1. 下载 WinSCP: https://winscp.net/
2. 连接到你的 ECS 服务器：
   - 协议: SFTP 或 SCP
   - 主机: 你的服务器 IP
   - 用户名: root (或其他用户)
   - 密码: 你的密码
3. 拖拽 `echo-app-deploy.zip` 到服务器的 `/root/` 目录

### 方法 C: 使用 FileZilla

1. 下载 FileZilla: https://filezilla-project.org/
2. 文件 → 站点管理器 → 新建站点
3. 配置 SFTP 连接
4. 上传文件

---

## 🔧 步骤 3: 在服务器上部署

### 连接到 ECS 服务器

```bash
ssh root@你的服务器IP
```

### 解压和配置

```bash
# 1. 解压文件
cd /root
unzip echo-app-deploy.zip
cd t3-app

# 2. 创建 .env 文件
cat > .env << 'EOF'
# ========================================
# Echo App - 生产环境配置
# ========================================

# 数据库配置 - 阿里云 PostgreSQL
DATABASE_URL="postgresql://echo_user:Czx2002517!@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo?schema=public&sslmode=require&connection_limit=10&pool_timeout=20"

# NextAuth.js 配置
NEXTAUTH_SECRET="Apw2acnT7u81F3mYRcHHo1bVG18sNMOlqEfhwAYpxPw="
NEXTAUTH_URL="https://你的域名.com"

# 应用配置
NODE_ENV="production"
LOG_LEVEL="info"
PORT="3000"
EOF

# 设置文件权限
chmod 600 .env

# 3. 安装依赖
npm ci --only=production

# 4. 生成 Prisma Client
npx prisma generate

# 5. 构建应用
npm run build

# 6. 测试应用
npm start
# 访问 http://服务器IP:3000 测试
# 测试成功后按 Ctrl+C 停止

# 7. 使用 PM2 管理进程
npm install -g pm2

# 启动应用
pm2 start npm --name echo-app -- start

# 查看日志
pm2 logs echo-app

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
```

---

## 🌐 步骤 4: 配置 Nginx (可选但推荐)

### 安装 Nginx

```bash
# Ubuntu/Debian
apt update
apt install nginx -y

# CentOS/RHEL
yum install nginx -y
```

### 配置反向代理

```bash
# 创建配置文件
cat > /etc/nginx/sites-available/echo-app << 'EOF'
server {
    listen 80;
    server_name 你的域名.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/echo-app /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## 🔒 步骤 5: 配置 SSL (可选但推荐)

### 使用 Let's Encrypt (免费)

```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 获取证书
certbot --nginx -d 你的域名.com

# 自动续期
certbot renew --dry-run
```

---

## 🔧 步骤 6: 配置防火墙

### 阿里云安全组

1. 登录阿里云控制台
2. 进入 ECS 实例
3. 安全组 → 配置规则
4. 添加入方向规则：
   - 端口: 80 (HTTP)
   - 端口: 443 (HTTPS)
   - 端口: 3000 (如果不使用 Nginx)
   - 源: 0.0.0.0/0

### 服务器防火墙 (UFW)

```bash
# 启用 UFW
ufw enable

# 允许必要端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# 查看状态
ufw status
```

---

## ✅ 步骤 7: 验证部署

### 检查应用状态

```bash
# 查看 PM2 状态
pm2 status

# 查看日志
pm2 logs echo-app --lines 100

# 查看错误日志
pm2 logs echo-app --err --lines 50

# 监控资源使用
pm2 monit
```

### 测试访问

```bash
# 本地测试
curl http://localhost:3000

# 外部测试（在本地电脑）
curl http://你的服务器IP:3000
# 或浏览器访问 http://你的服务器IP:3000
```

---

## 🔄 后续更新部署

### 快速更新脚本

在服务器上创建更新脚本：

```bash
cat > /root/update-echo-app.sh << 'EOF'
#!/bin/bash
echo "🔄 更新 Echo App..."

cd /root/t3-app

# 备份当前版本
echo "📦 备份当前版本..."
tar -czf ../backup-$(date +%Y%m%d-%H%M%S).tar.gz .

# 停止应用
echo "⏸️  停止应用..."
pm2 stop echo-app

# 拉取新代码（或解压新的压缩包）
echo "📥 部署新版本..."
# 如果使用 git:
# git pull origin main

# 如果使用压缩包，先上传新的 zip 到 /root/，然后：
# unzip -o /root/echo-app-deploy.zip -d /root/

# 安装新依赖
echo "📦 安装依赖..."
npm ci --only=production

# 重新生成 Prisma Client
echo "🔄 生成 Prisma Client..."
npx prisma generate

# 构建应用
echo "🏗️  构建应用..."
npm run build

# 重启应用
echo "🚀 启动应用..."
pm2 restart echo-app

echo "✅ 更新完成！"
pm2 logs echo-app --lines 20
EOF

chmod +x /root/update-echo-app.sh
```

使用更新脚本：

```bash
# 1. 上传新的 echo-app-deploy.zip 到服务器
# 2. 运行更新脚本
/root/update-echo-app.sh
```

---

## 📊 监控和维护

### 日志管理

```bash
# 实时查看日志
pm2 logs echo-app

# 清空日志
pm2 flush echo-app

# 日志轮转
pm2 install pm2-logrotate
```

### 性能监控

```bash
# 安装 PM2 监控
pm2 install pm2-server-monit

# 或使用阿里云监控
# 在阿里云控制台配置云监控告警
```

### 数据库备份

```bash
# 创建备份脚本
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# 使用 pg_dump 备份
PGPASSWORD="Czx2002517!" pg_dump -h pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com -U echo_user -d echo > $BACKUP_DIR/echo-$DATE.sql

# 压缩备份
gzip $BACKUP_DIR/echo-$DATE.sql

# 删除30天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ 备份完成: $BACKUP_DIR/echo-$DATE.sql.gz"
EOF

chmod +x /root/backup-db.sh

# 设置定时备份（每天凌晨2点）
crontab -e
# 添加: 0 2 * * * /root/backup-db.sh
```

---

## 🐛 故障排查

### 应用无法启动

```bash
# 查看详细错误
pm2 logs echo-app --err

# 检查端口占用
netstat -tlnp | grep 3000

# 检查环境变量
cat .env

# 手动启动查看错误
NODE_ENV=production npm start
```

### 数据库连接失败

```bash
# 测试连接
psql "postgresql://echo_user:密码@pgm-bp195rs24s2476mydo.pg.rds.aliyuncs.com:5432/echo" -c "SELECT 1"

# 检查白名单
# 登录阿里云控制台检查 RDS 白名单是否包含 ECS 服务器 IP
```

### 内存不足

```bash
# 查看内存使用
free -h

# 限制 Node.js 内存
pm2 start npm --name echo-app --max-memory-restart 500M -- start
```

---

## 📚 快速命令参考

```bash
# PM2 常用命令
pm2 start echo-app      # 启动
pm2 stop echo-app       # 停止
pm2 restart echo-app    # 重启
pm2 delete echo-app     # 删除
pm2 logs echo-app       # 查看日志
pm2 monit              # 监控
pm2 list               # 列表

# 服务管理
systemctl status nginx  # Nginx 状态
systemctl restart nginx # 重启 Nginx

# 数据库
npx prisma studio      # 打开数据库管理界面（本地）
npx prisma db push     # 推送 schema 变更
```

---

## ✅ 部署检查清单

- [ ] 压缩包已创建
- [ ] 文件已上传到服务器
- [ ] .env 文件已配置
- [ ] 依赖已安装
- [ ] Prisma Client 已生成
- [ ] 应用已构建
- [ ] PM2 已启动应用
- [ ] 应用可以访问
- [ ] Nginx 已配置（如果需要）
- [ ] SSL 已配置（如果需要）
- [ ] 防火墙已配置
- [ ] 数据库连接正常
- [ ] 自动备份已设置

---

**部署完成！** 🎉

你的 Echo App 现在运行在阿里云 ECS 上了！

访问: https://你的域名.com

