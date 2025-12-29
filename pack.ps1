Write-Host "Packing Echo App..." -ForegroundColor Cyan

$output = "C:\Users\ASUS\Desktop\echo.tar.gz"

# 排除的文件夹和文件
$exclude = @(
    "node_modules",
    ".next",
    ".git",
    ".env",
    ".env.local",
    ".env.development.local",
    "*.db",
    "*.log",
    ".cache",
    "tsconfig.tsbuildinfo",
    ".vercel"
)

# 构建 tar 排除参数
$excludeArgs = $exclude | ForEach-Object { "--exclude=$_" }

# 打包
cd C:\Users\ASUS\Desktop
tar -czf $output $excludeArgs t3-app

$size = [math]::Round((Get-Item $output).Length / 1MB, 2)
Write-Host "Done! $size MB" -ForegroundColor Green
Write-Host $output -ForegroundColor Yellow

