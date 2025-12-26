# 连续天数功能测试指南

## 🎯 快速测试步骤

### 测试 1：首次完成目标

1. **打开浏览器控制台**（F12）

2. **重置连续天数为 0**（模拟新用户）
```javascript
const stats = JSON.parse(localStorage.getItem('dashboardStats'));
stats.streakDays = 0;
localStorage.setItem('dashboardStats', JSON.stringify(stats));
location.reload();
```

3. **确认连续天数显示为 0**
   - 查看个人主页的连续天数卡片
   - 应该显示 "0 天"

4. **创建或选择主要计划**
   - 设置最小专注时长（例如 25 分钟）

5. **开始并完成一次专注**
   - 时长 ≥ 主要计划的最小专注时长
   - 点击"完成"按钮

6. **检查结果**
   - ✅ 连续天数应该立即变为 1
   - ✅ 控制台应该显示：
     ```
     🔥 连续专注天数 +1 { 原值: 0, 新值: 1, 日期: '2025-12-26', 原因: '完成主要计划最小专注时长目标' }
     ✅ 连续天数已同步到数据库
     🌳 心树 EXP + 10 （累计专注 1 天）
     ```

---

### 测试 2：防重复更新

1. **在同一天再完成一次专注**
   - 时长 ≥ 主要计划的最小专注时长
   - 点击"完成"按钮

2. **检查结果**
   - ✅ 连续天数应该保持为 1（不会变成 2）
   - ✅ 控制台不应该再显示 "连续专注天数 +1"

3. **验证防重复机制**
```javascript
const today = new Date().toISOString().split('T')[0];
console.log('今天已更新:', localStorage.getItem(`streakUpdated_${today}`));
// 应该显示: "true"
```

---

### 测试 3：连续多天完成

1. **模拟第二天**
```javascript
// 清除今天的更新标记
const today = new Date().toISOString().split('T')[0];
localStorage.removeItem(`streakUpdated_${today}`);

// 修改最后专注日期为昨天
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
localStorage.setItem('lastFocusDate', yesterday.toISOString().split('T')[0]);

location.reload();
```

2. **完成一次专注**
   - 时长 ≥ 主要计划的最小专注时长

3. **检查结果**
   - ✅ 连续天数应该从 1 变为 2
   - ✅ 控制台显示 "连续专注天数 +1"

---

### 测试 4：数据库同步验证

1. **打开浏览器控制台**

2. **检查数据库中的连续天数**
```javascript
fetch('/api/user/stats')
  .then(res => res.json())
  .then(data => {
    console.log('数据库中的连续天数:', data.stats.streakDays);
    console.log('最后更新日期:', data.stats.lastStreakDate);
  });
```

3. **验证**
   - ✅ 数据库中的值应该与前端显示一致
   - ✅ `lastStreakDate` 应该是今天的日期

---

## 🔍 调试命令

### 查看当前状态
```javascript
// 查看连续天数
const stats = JSON.parse(localStorage.getItem('dashboardStats'));
console.log('连续天数:', stats.streakDays);

// 查看今天是否已更新
const today = new Date().toISOString().split('T')[0];
console.log('今天已更新:', localStorage.getItem(`streakUpdated_${today}`));

// 查看最后专注日期
console.log('最后专注日期:', localStorage.getItem('lastFocusDate'));
```

### 重置测试环境
```javascript
// 重置连续天数
const stats = JSON.parse(localStorage.getItem('dashboardStats'));
stats.streakDays = 0;
localStorage.setItem('dashboardStats', JSON.stringify(stats));

// 清除所有更新标记
Object.keys(localStorage)
  .filter(key => key.startsWith('streakUpdated_'))
  .forEach(key => localStorage.removeItem(key));

// 刷新页面
location.reload();
```

### 模拟特定天数
```javascript
// 设置连续天数为 6（测试第 7 天奖励）
const stats = JSON.parse(localStorage.getItem('dashboardStats'));
stats.streakDays = 6;
localStorage.setItem('dashboardStats', JSON.stringify(stats));

// 清除今天的更新标记
const today = new Date().toISOString().split('T')[0];
localStorage.removeItem(`streakUpdated_${today}`);

location.reload();
// 然后完成一次专注，应该触发第 7 天奖励
```

---

## ✅ 预期行为

### 正常流程
1. **新用户**：连续天数 = 0
2. **完成第一次目标**：连续天数 = 1（立即显示）
3. **同一天再完成**：连续天数保持 1（防重复）
4. **第二天完成目标**：连续天数 = 2
5. **第三天未完成**：连续天数保持 2（不会减少）
6. **第四天完成目标**：连续天数 = 3

### 关键节点奖励
- **第 7 天**：心树获得施肥 Buff
- **第 14 天**：心树获得施肥 Buff
- **第 30 天**：心树获得施肥 Buff

---

## 🐛 常见问题

### 问题 1：连续天数没有增加

**检查**：
```javascript
// 1. 检查是否达到目标时长
const stats = JSON.parse(localStorage.getItem('todayStats'));
const today = new Date().toISOString().split('T')[0];
console.log('今日专注时长:', stats[today]?.minutes, '分钟');

// 2. 检查主要计划的目标时长
console.log('主要计划:', localStorage.getItem('primaryPlan'));

// 3. 检查是否已更新
console.log('今天已更新:', localStorage.getItem(`streakUpdated_${today}`));
```

**可能原因**：
- 专注时长未达到主要计划的最小专注时长
- 今天已经更新过了（防重复机制）
- 没有设置主要计划

---

### 问题 2：连续天数显示为 0 但应该有值

**检查**：
```javascript
// 检查 localStorage
const stats = JSON.parse(localStorage.getItem('dashboardStats'));
console.log('localStorage 中的连续天数:', stats.streakDays);

// 检查数据库
fetch('/api/user/stats')
  .then(res => res.json())
  .then(data => console.log('数据库中的连续天数:', data.stats.streakDays));
```

**解决方案**：
- 如果 localStorage 有值但显示为 0 → 检查代码是否还有 `Math.max(1, ...)` 包装
- 如果数据库有值但前端为 0 → 刷新页面重新加载数据

---

### 问题 3：数据库同步失败

**检查控制台错误**：
- 查看是否有 "连续天数同步失败" 的警告
- 检查网络请求是否成功

**手动同步**：
```javascript
const stats = JSON.parse(localStorage.getItem('dashboardStats'));
const today = new Date().toISOString().split('T')[0];

fetch('/api/user/stats/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    streakDays: stats.streakDays,
    lastStreakDate: today,
  }),
})
.then(res => res.json())
.then(data => console.log('同步结果:', data));
```

---

## 📊 测试检查清单

- [ ] 新用户连续天数显示 0
- [ ] 完成第一次目标后连续天数变为 1
- [ ] 同一天多次完成不会重复增加
- [ ] 连续多天完成能正确累计
- [ ] 某天未完成不会减少连续天数
- [ ] 数据库正确同步
- [ ] 第 7/14/30 天触发特殊奖励
- [ ] 控制台日志清晰显示更新过程
- [ ] 移动端和桌面端都正常工作

---

**测试日期**：2025-12-26  
**预计测试时间**：10-15 分钟

