# 数据同步测试指南

## 🎯 测试目的

验证 Echo 应用的数据同步机制是否正常工作，确保：
1. 数据库和localStorage正确同步
2. 跨设备数据一致性
3. 数据不会丢失

---

## 🧪 测试方法

### 方法1: 自动测试脚本（推荐）

#### Node.js 版本（完整测试）

```bash
npx tsx scripts/test-data-sync.ts
```

**输出示例**：
```
🧪 开始数据同步测试...

📋 测试1: 检查localStorage过度依赖
✅ 应该在数据库的数据: 10项
📦 可以只在localStorage的数据: 7项

📋 测试2: 数据库→localStorage同步机制
✅ 发现 3 个同步点

📋 测试3: localStorage→数据库同步机制
✅ 检查了 6 个写入点

📋 测试4: 跨设备数据一致性分析
✅ 所有关键数据跨设备一致

📊 测试结果汇总
总计: 5 个测试
✅ 通过: 5
⚠️ 问题: 0
```

#### 浏览器版本（实时测试）

1. 登录到 Echo 应用
2. 打开浏览器控制台（F12）
3. 运行以下命令：

```javascript
// 加载测试脚本
const script = document.createElement('script');
script.src = '/test-data-sync.js';
document.body.appendChild(script);
```

**或者直接访问**：
```
http://localhost:3000/test-data-sync.js
```
复制内容到控制台运行。

---

## 🧪 手动测试用例

### 测试用例1: 基础数据同步

**目的**：验证localStorage和数据库数据一致

**步骤**：
1. 登录账号A
2. 打开控制台，查看localStorage数据：
   ```javascript
   console.log('userExp:', localStorage.getItem('userExp'));
   console.log('todayStats:', localStorage.getItem('todayStats'));
   ```
3. 查看数据库数据：
   ```javascript
   fetch('/api/user/exp').then(r => r.json()).then(d => console.log('数据库userExp:', d.exp));
   fetch('/api/dashboard/stats').then(r => r.json()).then(d => console.log('数据库stats:', d));
   ```
4. 对比两者是否一致

**预期结果**：✅ 数据一致

---

### 测试用例2: 跨设备同步

**目的**：验证不同设备看到相同数据

**步骤**：
1. **设备A**（电脑）：
   - 登录账号 test@example.com
   - 完成30分钟专注
   - 记录今日专注时长：30分钟
   - 退出登录

2. **设备B**（手机或另一个浏览器）：
   - 登录同一账号 test@example.com
   - 查看今日专注时长
   - 应该显示：30分钟

3. **验证**：
   ```javascript
   // 在设备B的控制台运行
   fetch('/api/dashboard/stats')
     .then(r => r.json())
     .then(d => console.log('今日专注:', d.todayMinutes, '分钟'));
   ```

**预期结果**：✅ 设备B显示30分钟

---

### 测试用例3: 并发更新

**目的**：验证多设备同时操作时数据正确性

**步骤**：
1. **设备A和设备B同时登录同一账号**
2. **设备A**：完成20分钟专注
3. **设备B**：完成30分钟专注
4. **设备A**：刷新页面
5. **验证**：设备A应该显示50分钟（20+30）

**预期结果**：✅ 累加正确

---

### 测试用例4: 数据恢复

**目的**：验证数据丢失后能否从数据库恢复

**步骤**：
1. 登录账号A
2. 记录当前数据：
   ```javascript
   const backup = {
     userExp: localStorage.getItem('userExp'),
     todayStats: localStorage.getItem('todayStats'),
   };
   console.log('备份数据:', backup);
   ```
3. 清空localStorage：
   ```javascript
   localStorage.clear();
   ```
4. 刷新页面
5. 检查数据是否恢复：
   ```javascript
   console.log('恢复后userExp:', localStorage.getItem('userExp'));
   console.log('恢复后todayStats:', localStorage.getItem('todayStats'));
   ```

**预期结果**：✅ 数据从数据库恢复

---

### 测试用例5: 用户隔离

**目的**：验证多账号数据不会相互干扰

**步骤**：
1. 登录账号A (test1@example.com)
2. 创建计划"学习编程"
3. 记录localStorage：
   ```javascript
   console.log('账号A的计划:', localStorage.getItem('userPlans'));
   ```
4. 退出登录
5. 登录账号B (test2@example.com)
6. 检查计划列表
7. 应该看不到"学习编程"

**预期结果**：✅ 账号B看不到账号A的计划

---

## 📊 测试检查清单

### 数据库→localStorage同步

- [ ] 登录时，localStorage自动更新为数据库数据
- [ ] Dashboard加载时，过期数据自动刷新
- [ ] 预加载时，从数据库读取10项关键数据
- [ ] 专注完成后3秒，统计数据从数据库刷新

### localStorage→数据库同步

- [ ] 完成专注后，立即写入数据库（focus-sessions）
- [ ] 获得经验值后，立即写入数据库（user.exp）
- [ ] 创建计划后，立即写入数据库（projects）
- [ ] 解锁成就后，立即写入数据库（achievements）
- [ ] 连续天数更新后，延迟3秒写入数据库

### 跨设备一致性

- [ ] 设备A完成专注，设备B刷新后能看到
- [ ] 设备A创建计划，设备B刷新后能看到
- [ ] 设备A解锁成就，设备B刷新后能看到
- [ ] 设备A和设备B的经验值、等级、心树数据一致

### 用户隔离

- [ ] 账号A的数据不会出现在账号B
- [ ] localStorage使用 `user_{userId}_` 前缀
- [ ] 多账号登录不会相互覆盖

---

## 🔍 调试命令

### 查看localStorage数据

```javascript
// 查看所有key
Object.keys(localStorage).forEach(key => {
  console.log(key, ':', localStorage.getItem(key));
});

// 查看特定数据
console.log('用户经验:', localStorage.getItem('userExp'));
console.log('今日统计:', JSON.parse(localStorage.getItem('todayStats') || '{}'));
console.log('用户计划:', JSON.parse(localStorage.getItem('userPlans') || '[]'));
```

### 查看数据库数据

```javascript
// 用户经验值
fetch('/api/user/exp').then(r => r.json()).then(console.log);

// 统计数据
fetch('/api/dashboard/stats').then(r => r.json()).then(console.log);

// 用户计划
fetch('/api/projects').then(r => r.json()).then(console.log);

// 专注记录
fetch('/api/focus-sessions').then(r => r.json()).then(console.log);
```

### 强制同步数据

```javascript
// 方法1: 刷新页面
location.reload();

// 方法2: 手动触发同步
fetch('/api/user/sync-all-data')
  .then(r => r.json())
  .then(data => {
    console.log('同步完成:', data);
    location.reload();
  });
```

### 清除缓存重新加载

```javascript
// 清除localStorage
localStorage.clear();

// 刷新页面（会从数据库重新加载）
location.reload();
```

---

## 🐛 常见问题排查

### 问题1: 数据不一致

**症状**：localStorage和数据库数据不同

**排查**：
```javascript
// 1. 检查最后同步时间
console.log('最后同步:', localStorage.getItem('dashboardDataSyncedAt'));

// 2. 对比数据
const localExp = localStorage.getItem('userExp');
fetch('/api/user/exp').then(r => r.json()).then(d => {
  console.log('localStorage:', localExp);
  console.log('数据库:', d.exp);
  console.log('一致性:', localExp === d.exp.toString() ? '✅' : '❌');
});
```

**解决**：
1. 刷新页面（自动从数据库同步）
2. 或手动触发同步：
   ```javascript
   fetch('/api/user/sync-all-data').then(() => location.reload());
   ```

---

### 问题2: 跨设备数据不同步

**症状**：设备A的操作在设备B看不到

**排查**：
```javascript
// 在设备B运行
fetch('/api/dashboard/stats')
  .then(r => r.json())
  .then(d => console.log('数据库数据:', d));
```

**解决**：
1. 设备B刷新页面
2. 检查设备A的操作是否成功写入数据库
3. 检查网络连接

---

### 问题3: 用户隔离失效

**症状**：账号A的数据出现在账号B

**排查**：
```javascript
// 检查当前用户ID
console.log('当前用户ID:', sessionStorage.getItem('currentUserId'));

// 检查用户隔离的key
const userId = sessionStorage.getItem('currentUserId');
const userKeys = Object.keys(localStorage).filter(k => k.startsWith(`user_${userId}_`));
console.log('用户隔离数据:', userKeys);
```

**解决**：
1. 确保登录时调用了 `setCurrentUserId()`
2. 检查是否使用了 `userStorageJSON` 而不是直接的 `localStorage`

---

## 📈 性能测试

### 测试加载时间

```javascript
console.time('Dashboard加载');

// 刷新页面
location.reload();

// 页面加载完成后在控制台运行
console.timeEnd('Dashboard加载');
```

**预期**：1-3秒

### 测试数据库响应时间

```javascript
// 测试各个API的响应时间
const apis = [
  '/api/user/exp',
  '/api/dashboard/stats',
  '/api/projects',
  '/api/heart-tree/exp',
];

apis.forEach(async (api) => {
  const start = Date.now();
  await fetch(api);
  const end = Date.now();
  console.log(`${api}: ${end - start}ms`);
});
```

**预期**：每个API < 200ms

---

## ✅ 测试通过标准

### 基础功能
- [ ] localStorage数据存在且结构正确
- [ ] 数据库API正常响应
- [ ] localStorage和数据库数据一致

### 同步机制
- [ ] 登录时自动同步
- [ ] 数据过期时自动刷新
- [ ] 操作完成后正确更新

### 跨设备一致性
- [ ] 设备A的操作在设备B可见（刷新后）
- [ ] 所有关键数据跨设备一致
- [ ] UI状态正确隔离（每设备独立）

### 用户隔离
- [ ] 多账号数据不会相互干扰
- [ ] localStorage使用用户ID前缀
- [ ] 切换账号后数据正确切换

---

## 🚀 快速测试命令

### 一键测试（Node.js）

```bash
npx tsx scripts/test-data-sync.ts
```

### 一键测试（浏览器）

打开控制台，运行：
```javascript
fetch('/test-data-sync.js')
  .then(r => r.text())
  .then(code => eval(code));
```

---

## 📝 测试记录模板

```
测试日期: 2025-12-27
测试账号: test@example.com
测试设备: Chrome / Windows

测试结果:
[ ] localStorage数据检查 - 通过/失败
[ ] 数据库数据检查 - 通过/失败
[ ] 数据一致性对比 - 通过/失败
[ ] 跨设备同步 - 通过/失败
[ ] 用户隔离 - 通过/失败

问题记录:
1. ...
2. ...

建议:
1. ...
2. ...
```

---

**创建时间**：2025-12-27  
**版本**：v1.0.0



