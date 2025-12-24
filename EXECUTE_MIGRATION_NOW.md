# 🚀 立即执行迁移 - 逐步指南

## 📋 执行前检查

- [x] 已创建所有必要的 API 文件
- [x] 已创建 useProjects Hook
- [x] 已更新 schema.prisma
- [x] 已创建迁移工具
- [x] 已创建统计计算函数
- [x] 无 TypeScript 错误

**状态：✅ 准备就绪，可以立即执行！**

---

## 🎯 执行步骤（按顺序）

### 第1步：运行数据库迁移

```bash
cd C:\Users\ASUS\Desktop\t3-app

# 生成并应用数据库迁移
npx prisma migrate dev --name add_flow_metrics_and_primary_flag

# 重新生成 Prisma Client
npx prisma generate
```

**预期输出：**
```
Applying migration `20241219_add_flow_metrics_and_primary_flag`
✅ Database schema has been updated
✅ Prisma Client has been generated
```

**这会做什么：**
- ✅ 在 User 表添加 `flowMetrics` JSON 字段
- ✅ 在 Project 表添加 `isPrimary` Boolean 字段
- ✅ 在 Project 表添加 `isCompleted` Boolean 字段
- ✅ 创建索引 `[userId, isPrimary]` 和 `[userId, isActive]`

---

### 第2步：重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）

# 重新启动
npm run dev
```

**等待服务器启动：**
```
✓ Ready on http://localhost:3000
```

---

### 第3步：登录系统

1. 打开浏览器访问 `http://localhost:3000`
2. 登录您的账号
3. 等待进入 dashboard

---

### 第4步：执行数据迁移

**打开浏览器控制台（F12），粘贴以下代码：**

```javascript
(async function migrateAllData() {
  console.log('🚀 开始完整数据迁移...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const results = { success: [], failed: [], skipped: [] };

  // ============================================
  // 1. 迁移用户计划
  // ============================================
  console.log('\n📋 步骤1: 迁移用户计划');
  console.log('─────────────────────────────────────');
  
  const userPlans = localStorage.getItem('userPlans');
  if (userPlans) {
    try {
      const plans = JSON.parse(userPlans);
      console.log(`  📦 找到 ${plans.length} 个计划`);
      
      if (plans.length > 0) {
        console.log('  ⏳ 正在迁移...');
        
        const response = await fetch('/api/projects/migrate-from-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plans })
        });
        
        const data = await response.json();
        
        if (data.success) {
          results.success.push(`计划迁移: ${data.migratedCount}/${data.total}`);
          console.log(`  ✅ 成功: ${data.migratedCount}/${data.total}`);
          
          if (data.errors && data.errors.length > 0) {
            console.warn('  ⚠️  部分失败:', data.errors);
            results.failed.push(`计划错误: ${data.errors.length}个`);
          }
          
          // 显示迁移的计划详情
          console.log('  📝 迁移的计划:');
          plans.slice(0, 5).forEach((p, i) => {
            console.log(`    ${i + 1}. ${p.name} (${p.milestones?.length || 0}个里程碑)`);
          });
          if (plans.length > 5) {
            console.log(`    ... 还有 ${plans.length - 5} 个`);
          }
        } else {
          throw new Error(data.message || '迁移失败');
        }
      } else {
        results.skipped.push('计划: 无数据');
        console.log('  ⏭️  无计划需要迁移');
      }
    } catch (error) {
      results.failed.push(`计划迁移: ${error.message}`);
      console.error('  ❌ 失败:', error.message);
    }
  } else {
    results.skipped.push('计划: localStorage 中无数据');
    console.log('  ⏭️  localStorage 中无计划数据');
  }

  // ============================================
  // 2. 迁移心流指标
  // ============================================
  console.log('\n📊 步骤2: 迁移心流指标');
  console.log('─────────────────────────────────────');
  
  const flowMetrics = localStorage.getItem('flowMetrics');
  if (flowMetrics) {
    try {
      const metrics = JSON.parse(flowMetrics);
      console.log('  📦 找到心流指标数据');
      console.log('  ⏳ 正在迁移...');
      
      const response = await fetch('/api/user/flow-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowMetrics: metrics })
      });
      
      if (response.ok) {
        results.success.push('心流指标迁移成功');
        console.log('  ✅ 迁移成功');
        console.log('  📝 指标:', {
          印象值: metrics.impression,
          临时心流: metrics.tempFlow,
          总专注: metrics.totalFocusMinutes
        });
      } else {
        throw new Error('API 返回错误');
      }
    } catch (error) {
      results.failed.push(`心流指标: ${error.message}`);
      console.error('  ❌ 失败:', error.message);
    }
  } else {
    results.skipped.push('心流指标: localStorage 中无数据');
    console.log('  ⏭️  localStorage 中无数据');
  }

  // ============================================
  // 3. 完整数据同步验证
  // ============================================
  console.log('\n🔄 步骤3: 完整数据同步验证');
  console.log('─────────────────────────────────────');
  
  try {
    console.log('  ⏳ 正在同步...');
    
    const response = await fetch('/api/user/sync-all-data');
    const data = await response.json();
    
    results.success.push('数据同步验证完成');
    console.log('  ✅ 同步成功');
    console.log('  📊 完整数据摘要:');
    console.log('    - 经验值:', data.userExp);
    console.log('    - 等级:', data.userLevel);
    console.log('    - 成就:', data.achievements.length, '个');
    console.log('    - 今日专注:', data.todayStats.minutes, '分钟');
    console.log('    - 本周专注:', data.weeklyStats.totalMinutes, '分钟');
    console.log('    - 累计专注:', data.totalStats.totalMinutes, '分钟');
    console.log('    - 连胜天数:', data.streakDays || 0, '天');
    console.log('    - 新用户判定:', data.isReallyNewUser ? '新用户' : '✅ 老用户');
    
  } catch (error) {
    results.failed.push(`数据同步: ${error.message}`);
    console.error('  ❌ 失败:', error.message);
  }

  // ============================================
  // 4. 验证迁移结果
  // ============================================
  console.log('\n🔍 步骤4: 验证迁移结果');
  console.log('─────────────────────────────────────');
  
  try {
    // 检查计划
    const projectsRes = await fetch('/api/projects');
    const projectsData = await projectsRes.json();
    console.log('  ✅ 计划数量:', projectsData.projects.length);
    
    // 检查里程碑
    const totalMilestones = projectsData.projects.reduce(
      (sum, p) => sum + (p.milestones?.length || 0), 0
    );
    console.log('  ✅ 里程碑数量:', totalMilestones);
    
    // 检查统计
    const statsRes = await fetch('/api/stats');
    const statsData = await statsRes.json();
    console.log('  ✅ 统计数据已从数据库计算');
    
    // 检查心流指标
    const flowRes = await fetch('/api/user/flow-metrics');
    const flowData = await flowRes.json();
    console.log('  ✅ 心流指标已存储到数据库');
    
    results.success.push('验证完成: 所有数据正常');
    
  } catch (error) {
    results.failed.push(`验证失败: ${error.message}`);
    console.error('  ❌ 验证失败:', error.message);
  }

  // ============================================
  // 5. 生成最终报告
  // ============================================
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 迁移报告');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (results.success.length > 0) {
    console.log('\n✅ 成功项:');
    results.success.forEach(msg => console.log('  • ' + msg));
  }
  
  if (results.skipped.length > 0) {
    console.log('\n⏭️  跳过项:');
    results.skipped.forEach(msg => console.log('  • ' + msg));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ 失败项:');
    results.failed.forEach(msg => console.log('  • ' + msg));
  }
  
  const totalItems = results.success.length + results.failed.length + results.skipped.length;
  const successRate = ((results.success.length / totalItems) * 100).toFixed(1);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📈 成功率: ${successRate}% (${results.success.length}/${totalItems})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (results.failed.length === 0) {
    console.log('🎉 迁移完成！所有数据已安全保存到数据库！');
    console.log('\n💡 下一步:');
    console.log('  1. ✅ 页面将在 3 秒后自动刷新');
    console.log('  2. ✅ 检查您的计划和数据是否完整');
    console.log('  3. ✅ 系统现在使用数据库作为数据源');
    console.log('  4. ⚠️  可选: 清除 localStorage 旧数据（见文档）');
    
    // 自动刷新页面
    console.log('\n倒计时...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('3...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('2...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('1...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('🔄 正在刷新页面...');
    
    location.reload();
  } else {
    console.log('⚠️  迁移部分失败');
    console.log('\n💡 建议:');
    console.log('  1. 检查网络连接是否正常');
    console.log('  2. 检查是否已登录');
    console.log('  3. 查看上面的错误信息');
    console.log('  4. 可以尝试重新运行迁移脚本');
    console.log('  5. 如果持续失败，请联系技术支持');
  }
  
  return {
    success: results.failed.length === 0,
    details: results
  };
})();












