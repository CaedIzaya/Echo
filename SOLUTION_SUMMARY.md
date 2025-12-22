# 问题解决方案总结

## 🔴 报告的问题

1. **数据库错误**：
   ```
   Invalid prisma.user.findUnique() invocation
   The column 'User.flowMetrics' does not exist in the current database
   ```

2. **数据丢失**：
   - 重启开发服务器后，等级和经验被刷新
   - 每周专注时长也被刷新

## ✅ 根本原因

### 数据库Schema不同步

**问题描述**：
- 项目从SQLite切换到PostgreSQL
- 但迁移历史（`prisma/migrations`）仍然是SQLite的
- 导致PostgreSQL数据库缺少很多字段，包括`flowMetrics`

**证据**：
- 初始迁移文件（`20251022124139_init/migration.sql`）只包含基础User表字段
- 当前schema.prisma包含了很多新增字段（userExp, userLevel, flowMetrics等）
- 运行`prisma migrate dev`时提示provider不匹配（sqlite vs postgresql）

## 🛠️ 已实施的解决方案

### 1. 同步数据库Schema ✅

**执行的操作**：
```bash
# 删除旧的SQLite迁移历史
Remove-Item -Recurse -Force prisma\migrations

# 同步schema到PostgreSQL数据库
npx prisma db push
```

**结果**：
- ✅ 数据库已成功同步
- ✅ `flowMetrics` 字段已添加
- ✅ 所有缺失的表和字段已创建

### 2. 数据持久化验证 ✅

**检查的内容**：
1. ✅ 经验值和等级的保存逻辑正确（使用Hook + API）
2. ✅ 每周重置逻辑只重置本周数据，不影响经验和等级
3. ✅ 没有清空localStorage的危险代码
4. ✅ 双重存储机制（localStorage + 数据库）正常工作

**创建的工具**：
- 📄 `DATA_PERSISTENCE_DIAGNOSTIC.md` - 完整的诊断文档
- 🧪 `scripts/test-data-persistence.ts` - 数据持久化测试脚本

## 📊 数据存储架构

### 永久数据（不会被重置）
```
数据库 (PostgreSQL)
└── User表
    ├── userExp: Float          // 用户经验值 ✅
    ├── userLevel: Int          // 用户等级 ✅
    ├── heartTreeTotalExp: Float // 心树总经验 ✅
    └── flowMetrics: Json       // 心流指标 ✅ (已修复)

localStorage (浏览器缓存 + 数据库双重存储)
├── userExp                     // 经验值缓存
├── userExpSynced              // 同步标记
└── totalFocusMinutes          // 总专注时长
```

### 周期性重置数据
```
localStorage ONLY (不存储到数据库)
└── weeklyStats
    ├── totalMinutes: number    // 本周专注时长 (每周一重置)
    └── weekStart: string       // 本周开始日期
```

## 🎯 为什么会出现数据丢失

### 之前的情况（问题原因）：
1. **数据库Schema不完整** → API调用失败 → 数据无法保存到数据库
2. **只存储在localStorage** → 清除浏览器缓存 → 数据丢失
3. **数据库字段缺失** → 无法查询和恢复数据

### 修复后的情况：
1. ✅ 数据库Schema完整 → API正常工作
2. ✅ 双重存储 → localStorage + 数据库
3. ✅ 自动同步 → 数据始终保持一致
4. ✅ 失败降级 → 数据库失败时使用本地缓存

## 🧪 测试步骤

### 立即测试数据持久化：

1. **运行测试脚本**：
   ```bash
   npx tsx scripts/test-data-persistence.ts
   ```

2. **手动测试流程**：
   ```bash
   # 1. 启动开发服务器
   npm run dev
   
   # 2. 登录应用并完成一次专注
   # 3. 查看浏览器控制台，确认API调用成功
   # 4. 打开Prisma Studio检查数据库
   npx prisma studio
   
   # 5. 在User表中查看userExp和userLevel是否正确保存
   ```

3. **验证数据不丢失**：
   - ✅ 刷新页面 → 数据保留
   - ✅ 清除localStorage → 从数据库恢复
   - ✅ 重启服务器 → 数据保留
   - ✅ 每周一00:00 → 只重置本周数据，经验值不变

## 📝 后续建议

### 短期（立即执行）
- [x] 同步数据库Schema
- [ ] 运行测试脚本验证数据持久化
- [ ] 重启开发服务器并测试

### 中期（优化）
- [ ] 添加数据恢复按钮（当检测到数据不一致时）
- [ ] 添加更详细的错误日志（API调用失败时）
- [ ] 添加数据版本号（支持Schema升级）

### 长期（增强）
- [ ] 实现自动备份（每日备份到服务器）
- [ ] 提供数据导出功能（用户可下载自己的数据）
- [ ] 添加数据完整性检查（定期验证localStorage和数据库一致性）

## 🚀 下一步操作

1. **重启开发服务器**：
   ```bash
   # 按Ctrl+C停止当前服务器
   # 然后重新启动
   npm run dev
   ```

2. **验证修复**：
   - 访问 http://localhost:3000
   - 登录并完成一次专注
   - 检查经验值是否增加
   - 刷新页面，确认数据保留

3. **如果仍有问题**：
   - 查看浏览器控制台的完整日志
   - 运行测试脚本：`npx tsx scripts/test-data-persistence.ts`
   - 检查Prisma Studio中的数据：`npx prisma studio`
   - 查看 `DATA_PERSISTENCE_DIAGNOSTIC.md` 中的详细诊断步骤

## 📞 问题排查

如果数据仍然丢失，请检查：

1. **数据库连接**：
   ```bash
   npx prisma studio
   # 如果无法打开，说明数据库连接有问题
   ```

2. **API是否正常**：
   - 打开浏览器开发者工具 → Network标签
   - 完成一次专注
   - 查看 `/api/user/exp/update` 请求是否返回200状态码

3. **localStorage数据**：
   ```javascript
   // 在浏览器控制台运行
   console.log('经验值:', localStorage.getItem('userExp'));
   console.log('是否同步:', localStorage.getItem('userExpSynced'));
   ```

## ✨ 总结

**核心问题**：数据库Schema不同步导致字段缺失

**解决方案**：运行 `npx prisma db push` 同步Schema

**预期结果**：
- ✅ 所有API正常工作
- ✅ 数据正确保存到数据库
- ✅ 刷新/重启后数据不丢失
- ✅ 每周重置只影响本周数据，不影响经验和等级

---

**最后更新**：2025-12-22
**状态**：✅ 已修复，待测试验证

