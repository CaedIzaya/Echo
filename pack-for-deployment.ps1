# ========================================
# Echo App - 部署打包脚本
# ========================================
# 创建适合部署的压缩包，排除不必要的文件

param(
    [string]$OutputPath = "C:\Users\ASUS\Desktop\echo-app-deploy.zip"
)

Write-Host "🚀 Echo App 部署打包工具" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 项目根目录
$ProjectRoot = $PSScriptRoot

# 要排除的文件和文件夹
$ExcludePatterns = @(
    "node_modules",
    ".next",
    "out",
    "build",
    "dist",
    ".cache",
    "*.tsbuildinfo",
    ".env",
    ".env.local",
    ".env.*.local",
    "*.log",
    "prisma\dev.db",
    "*.db",
    "*.db-journal",
    ".vscode",
    ".idea",
    ".git",
    ".vercel",
    "coverage",
    "*.tmp",
    "*.temp",
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini"
)

Write-Host "📋 排除以下文件/文件夹：" -ForegroundColor Yellow
$ExcludePatterns | ForEach-Object { Write-Host "  - $_" }
Write-Host ""

# 检查是否存在 .env 文件
if (Test-Path ".env") {
    Write-Host "⚠️  检测到 .env 文件" -ForegroundColor Yellow
    Write-Host "   为了安全，.env 文件不会被打包" -ForegroundColor Yellow
    Write-Host "   请在服务器上手动创建 .env 文件" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "📦 开始打包..." -ForegroundColor Green

try {
    # 创建临时目录
    $TempDir = Join-Path $env:TEMP "echo-app-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $TempAppDir = Join-Path $TempDir "t3-app"
    
    Write-Host "   创建临时目录: $TempDir"
    New-Item -ItemType Directory -Path $TempAppDir -Force | Out-Null
    
    # 复制文件（排除指定的文件和文件夹）
    Write-Host "   复制项目文件..."
    
    $FilesToCopy = Get-ChildItem -Path $ProjectRoot -Recurse -File | Where-Object {
        $file = $_
        $relativePath = $file.FullName.Substring($ProjectRoot.Length + 1)
        
        # 检查是否匹配排除模式
        $shouldExclude = $false
        foreach ($pattern in $ExcludePatterns) {
            if ($relativePath -like "*$pattern*" -or $file.Name -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        -not $shouldExclude
    }
    
    $totalFiles = $FilesToCopy.Count
    $counter = 0
    
    foreach ($file in $FilesToCopy) {
        $counter++
        $relativePath = $file.FullName.Substring($ProjectRoot.Length + 1)
        $targetPath = Join-Path $TempAppDir $relativePath
        $targetDir = Split-Path $targetPath -Parent
        
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        
        Copy-Item $file.FullName $targetPath -Force
        
        # 显示进度
        if ($counter % 100 -eq 0) {
            $percent = [math]::Round(($counter / $totalFiles) * 100, 1)
            Write-Host "   进度: $percent% ($counter/$totalFiles)" -ForegroundColor Gray
        }
    }
    
    Write-Host "   ✅ 复制完成: $totalFiles 个文件" -ForegroundColor Green
    Write-Host ""
    
    # 创建压缩包
    Write-Host "   压缩文件..." -ForegroundColor Cyan
    
    # 删除旧的压缩包（如果存在）
    if (Test-Path $OutputPath) {
        Remove-Item $OutputPath -Force
    }
    
    # 使用 .NET 压缩
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($TempDir, $OutputPath, 'Optimal', $false)
    
    # 清理临时目录
    Remove-Item -Path $TempDir -Recurse -Force
    
    # 获取文件大小
    $FileSize = (Get-Item $OutputPath).Length
    $FileSizeMB = [math]::Round($FileSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ 打包完成！" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 压缩包信息：" -ForegroundColor Cyan
    Write-Host "   路径: $OutputPath" -ForegroundColor White
    Write-Host "   大小: $FileSizeMB MB" -ForegroundColor White
    Write-Host "   文件数: $totalFiles" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 下一步操作：" -ForegroundColor Yellow
    Write-Host "   1. 使用 SCP/SFTP 上传到服务器" -ForegroundColor White
    Write-Host "   2. 在服务器上解压: unzip echo-app-deploy.zip" -ForegroundColor White
    Write-Host "   3. 进入目录: cd t3-app" -ForegroundColor White
    Write-Host "   4. 创建 .env 文件" -ForegroundColor White
    Write-Host "   5. 安装依赖: npm ci --only=production" -ForegroundColor White
    Write-Host "   6. 生成 Prisma Client: npx prisma generate" -ForegroundColor White
    Write-Host "   7. 构建应用: npm run build" -ForegroundColor White
    Write-Host "   8. 启动应用: pm2 start npm --name echo-app -- start" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ 打包失败: $_" -ForegroundColor Red
    exit 1
}

