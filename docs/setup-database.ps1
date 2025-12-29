# ========================================
# Echo App - 阿里云 PostgreSQL 快速配置脚本
# ========================================

Write-Host "🚀 Echo App - 数据库配置向导" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 检查 .env 文件是否存在
if (Test-Path ".env") {
    Write-Host "⚠️  检测到已存在的 .env 文件" -ForegroundColor Yellow
    $overwrite = Read-Host "是否覆盖？(y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ 已取消配置" -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "📝 请输入阿里云 PostgreSQL 连接信息：" -ForegroundColor Green
Write-Host ""

# 获取数据库信息
$dbHost = Read-Host "数据库主机地址 (例: rm-xxxxx.pg.rds.aliyuncs.com)"
$dbPort = Read-Host "端口 (默认: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }

$dbName = Read-Host "数据库名 (例: echo_db)"
$dbUser = Read-Host "用户名"
$dbPassword = Read-Host "密码" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

Write-Host ""
Write-Host "🔐 生成 NextAuth 密钥..." -ForegroundColor Green

# 生成随机密钥
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$nextAuthSecret = [Convert]::ToBase64String($bytes)

Write-Host "✅ 密钥已生成" -ForegroundColor Green
Write-Host ""

# 构建 DATABASE_URL
$databaseUrl = "postgresql://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}?schema=public"

# 创建 .env 文件
$envContent = @"
# ========================================
# Echo App - 环境变量配置
# ========================================
# 自动生成于: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# ========================================
# 数据库配置 - 阿里云 PostgreSQL
# ========================================
DATABASE_URL="$databaseUrl"

# ========================================
# NextAuth.js 配置
# ========================================
NEXTAUTH_SECRET="$nextAuthSecret"
NEXTAUTH_URL="http://localhost:3000"

# ========================================
# 应用配置
# ========================================
NODE_ENV="development"
LOG_LEVEL="info"
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "✅ .env 文件已创建" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 测试数据库连接..." -ForegroundColor Yellow

# 测试数据库连接
try {
    npm run db:health-check
    Write-Host ""
    Write-Host "✅ 数据库连接成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 下一步操作：" -ForegroundColor Cyan
    Write-Host "  1. 运行数据库迁移: npx prisma db push" -ForegroundColor White
    Write-Host "  2. 启动开发服务器: npm run dev" -ForegroundColor White
    Write-Host "  3. 打开浏览器: http://localhost:3000" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "❌ 数据库连接失败" -ForegroundColor Red
    Write-Host "请检查：" -ForegroundColor Yellow
    Write-Host "  1. 数据库连接信息是否正确" -ForegroundColor White
    Write-Host "  2. 阿里云白名单是否配置" -ForegroundColor White
    Write-Host "  3. 网络连接是否正常" -ForegroundColor White
    Write-Host ""
    Write-Host "详细信息请查看: ALIYUN_POSTGRESQL_SETUP.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

