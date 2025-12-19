# 数据库维护指南

## 📋 概述

本文档提供数据库维护、备份和恢复的操作指南，确保数据安全和系统稳定。

## 🗄️ 数据库结构

### 核心表
- **User**: 用户信息（含注册日期）
- **FocusSession**: 专注会话记录
- **DailySummary**: 每日小结（包含8个最近小结）
- **WeeklyReport**: 周报数据（保留12周）
- **Project**: 项目信息
- **Account/Session**: NextAuth认证数据

### 数据关系
```
User (1) ─── (N) FocusSession
  └─── (N) DailySummary
  └─── (N) WeeklyReport
  └─── (N) Project
```

## 🔧 数据库优化

### 索引策略
已添加以下索引以提升查询性能：

```prisma
// FocusSession
@@index([userId, startTime])  // 周报查询优化
@@index([userId, createdAt])  // 时间范围查询

// DailySummary
@@index([userId, date])        // 日期查询优化
@@index([date])                // 全局日期查询

// User
@@index([createdAt])           // 注册时间查询
@@index([email])               // 邮箱查询

// WeeklyReport
@@index([expiresAt])           // 过期数据清理
```

## 🛡️ 数据保护机制

### 1. 第一周保护
- 注册未满7天的用户不生成周报
- 避免数据不足导致的错误
- 友好的用户提示

### 2. 数据验证
- 专注时长不超过24小时
- 日期格式验证
- 自动修正异常数据

### 3. 事务保护
- 使用Prisma事务确保数据一致性
- 专注会话保存使用事务
- 防止部分写入导致数据不一致

### 4. 级联删除
- 删除用户时自动删除关联数据
- 使用 `onDelete: Cascade` 防止孤立数据

## 📦 备份策略

### Vercel Postgres (推荐)
如果使用Vercel Postgres，可以使用以下方法备份：

```bash
# 1. 导出数据库
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. 备份到云存储（如S3）
aws s3 cp backup_$(date +%Y%m%d).sql s3://your-bucket/backups/
```

### 定期备份脚本
创建 `scripts/backup-db.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_$DATE.sql"

echo "开始备份数据库..."
pg_dump $DATABASE_URL > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ 备份成功: $BACKUP_FILE"
    # 可选：上传到云存储
    # aws s3 cp $BACKUP_FILE s3://your-bucket/backups/
else
    echo "❌ 备份失败"
    exit 1
fi
```

### 自动备份（推荐）
使用cron job每天自动备份：

```bash
# 每天凌晨3点备份
0 3 * * * cd /path/to/project && ./scripts/backup-db.sh
```

## 🔄 数据恢复

### 从备份恢复
```bash
# 1. 恢复整个数据库
psql $DATABASE_URL < backup_20231216.sql

# 2. 恢复特定表
psql $DATABASE_URL -c "TRUNCATE TABLE weekly_reports CASCADE;"
psql $DATABASE_URL < backup_weekly_reports.sql
```

### 数据验证
恢复后运行健康检查：

```bash
npm run db:health-check
```

## 🧹 数据清理

### 清理过期周报
```bash
npm run cleanup:expired
```

这个脚本会删除：
- 超过12周的周报数据
- 已标记为过期的ShareLink

### 清理孤立数据
```bash
# 手动清理孤立的专注会话
psql $DATABASE_URL -c "DELETE FROM focus_sessions WHERE user_id NOT IN (SELECT id FROM users);"

# 手动清理孤立的每日小结
psql $DATABASE_URL -c "DELETE FROM daily_summaries WHERE user_id NOT IN (SELECT id FROM users);"
```

## 📊 监控和日志

### 健康检查
定期运行健康检查脚本：

```bash
npm run db:health-check
```

检查项目：
- ✅ 数据库连接
- ✅ 用户数据完整性
- ✅ 专注会话数据有效性
- ✅ 每日小结数据
- ✅ 周报数据
- ✅ 孤立数据检测

### 日志监控
所有关键操作都有详细日志：

- `[weekly-report]` - 周报生成日志
- `[focus-sessions]` - 专注会话保存日志
- `[refreshDailySummary]` - 每日小结刷新日志
- `[persistWeekly]` - 周报持久化日志

在Vercel控制台或服务器日志中查看。

## 🚨 故障排查

### 问题：周报加载失败

**可能原因：**
1. 用户注册不足7天 → 显示友好提示
2. 数据库查询超时 → 检查索引和数据量
3. 数据格式错误 → 运行健康检查

**解决方案：**
```bash
# 1. 检查用户注册日期
psql $DATABASE_URL -c "SELECT id, email, created_at FROM users WHERE id = 'USER_ID';"

# 2. 运行健康检查
npm run db:health-check

# 3. 检查日志
# 在Vercel控制台查看实时日志
```

### 问题：数据丢失

**预防措施：**
1. ✅ 已实现级联删除保护
2. ✅ 使用事务确保原子性
3. ✅ 每日小结自动刷新
4. ✅ 周报数据持久化

**恢复步骤：**
1. 从最近的备份恢复
2. 运行数据库迁移
3. 验证数据完整性

### 问题：查询性能慢

**优化建议：**
1. ✅ 已添加必要索引
2. 定期清理过期数据
3. 监控查询性能
4. 考虑数据分区（数据量大时）

## 📝 维护检查清单

### 每日
- [ ] 检查应用日志（Vercel控制台）
- [ ] 监控错误率

### 每周
- [ ] 运行健康检查脚本
- [ ] 清理过期周报

### 每月
- [ ] 完整数据库备份
- [ ] 审查数据增长趋势
- [ ] 优化查询性能

## 🔧 常用命令

```bash
# 数据库迁移
npm run db:push              # 推送schema变更
npm run db:migrate           # 创建迁移文件

# 维护脚本
npm run db:health-check      # 健康检查
npm run cleanup:expired      # 清理过期数据

# Prisma Studio（数据库GUI）
npx prisma studio            # 打开可视化界面
```

## 📚 相关文档

- [Prisma文档](https://www.prisma.io/docs)
- [Vercel Postgres文档](https://vercel.com/docs/storage/vercel-postgres)
- [PostgreSQL备份文档](https://www.postgresql.org/docs/current/backup.html)

## ⚡ 性能优化建议

1. **索引优化**: 已实现核心索引
2. **查询优化**: 使用选择性查询（select）
3. **连接池**: Vercel自动管理
4. **缓存**: 考虑添加Redis缓存热数据
5. **分页**: 大数据量查询使用分页

## 🎯 最佳实践

1. ✅ 定期备份（每日）
2. ✅ 监控日志
3. ✅ 运行健康检查（每周）
4. ✅ 清理过期数据（自动）
5. ✅ 使用事务保证一致性
6. ✅ 添加适当索引
7. ✅ 数据验证和错误处理

---

**最后更新**: 2024-12-16
**维护者**: 开发团队



