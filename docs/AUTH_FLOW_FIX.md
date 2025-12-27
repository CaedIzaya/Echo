# 登录登出流程修复

## 🐛 问题描述

### 症状
退出登录后无法停留在登录页面，登录页面一闪而过，然后又重定向到 dashboard。

### 根本原因
1. **Dashboard 页面**在检测到未认证时，使用 `window.location.href = '/auth/signin'` 重定向到登录页
2. **首页逻辑**会自动检测 session 状态，如果检测到用户已登录，会立即重定向到 dashboard
3. 这导致了一个重定向循环：
   ```
   用户点击退出 → Dashboard → 登录页 → 首页检测session → Dashboard
   ```

### 问题代码

**修复前（错误）：**
```typescript
// dashboard/index.tsx
if (authKey === 'unauthenticated') {
  console.log('❌ 未认证，重定向');
  window.location.href = '/auth/signin';  // ❌ 错误：直接跳转到登录页
  return;
}
```

---

## ✅ 修复方案

### 核心思路
未认证用户应该重定向到**首页**而不是登录页，因为：
1. 首页会显示欢迎界面
2. 首页已经有完善的认证检查逻辑
3. 用户可以从首页选择登录或注册

### 修复代码

**修复后（正确）：**
```typescript
// dashboard/index.tsx
if (authKey === 'unauthenticated') {
  console.log('❌ 未认证，重定向到首页');
  router.push('/');  // ✅ 正确：重定向到首页
  return;
}
```

---

## 📝 修改的文件

### 1. `src/pages/dashboard/index.tsx`
- 修改未认证重定向目标：从 `/auth/signin` 改为 `/`

### 2. `src/pages/dashboard/index.mobile.tsx`
- 修改未认证重定向目标：从 `/auth/signin` 改为 `/`

### 3. `src/pages/plans/index.tsx`
- 修改未认证重定向目标：从 `/auth/signin` 改为 `/`

---

## 🔄 正确的认证流程

### 登出流程
```
用户点击"退出登录"
    ↓
UserMenu.handleSignOut()
    ↓
清除 sessionStorage
清除 NextAuth cookies
    ↓
signOut({ callbackUrl: '/?signedOut=true' })
    ↓
重定向到首页（带 signedOut 参数）
    ↓
首页检测到 signedOut=true
    ↓
清除 URL 参数
验证 session 已清除
    ↓
显示欢迎界面 ✅
```

### 访问受保护页面（未登录）
```
未登录用户访问 /dashboard
    ↓
Dashboard 检测到 unauthenticated
    ↓
重定向到首页 (/)
    ↓
首页显示欢迎界面
    ↓
用户可以选择登录或注册 ✅
```

### 登录流程
```
用户在首页点击"开始使用"
    ↓
跳转到 /auth/signin
    ↓
用户输入凭据并登录
    ↓
NextAuth 验证成功
    ↓
重定向到首页
    ↓
首页检测到 session
    ↓
根据 onboarding 状态重定向：
  - 未完成 → /onboarding
  - 已完成 → /dashboard ✅
```

---

## 🧪 测试场景

### 场景 1：正常登出
1. 用户已登录，在 dashboard 页面
2. 点击用户菜单 → "退出登录"
3. **预期结果：** 
   - ✅ 重定向到首页
   - ✅ 显示欢迎界面
   - ✅ 不会再跳回 dashboard

### 场景 2：未登录访问受保护页面
1. 用户未登录
2. 直接访问 `/dashboard` 或 `/plans`
3. **预期结果：**
   - ✅ 重定向到首页
   - ✅ 显示欢迎界面
   - ✅ 可以选择登录

### 场景 3：登录后自动跳转
1. 用户在首页点击"开始使用"
2. 在登录页输入凭据
3. 登录成功
4. **预期结果：**
   - ✅ 重定向到首页（短暂）
   - ✅ 首页检测到 session
   - ✅ 自动跳转到 dashboard 或 onboarding

### 场景 4：刷新页面
1. 用户已登录，在 dashboard 页面
2. 刷新页面 (F5)
3. **预期结果：**
   - ✅ 保持在 dashboard
   - ✅ 数据正常加载
   - ✅ 不会跳转到首页

---

## 🔍 调试信息

### 查看认证状态

在浏览器控制台运行：
```javascript
// 检查 session
fetch('/api/auth/session')
  .then(res => res.json())
  .then(data => console.log('Session:', data));

// 检查 cookies
console.log('Cookies:', document.cookie);

// 检查 sessionStorage
console.log('SessionStorage:', sessionStorage);
```

### 常见问题

#### 问题 1：退出后仍然显示已登录
**原因：** Session 缓存未清除

**解决方案：**
```javascript
// 强制清除缓存
sessionStorage.clear();
// 刷新页面
location.reload();
```

#### 问题 2：登录后跳转到错误页面
**原因：** `callbackUrl` 设置不正确

**解决方案：**
检查 `signIn` 调用中的 `callbackUrl` 参数

#### 问题 3：无限重定向循环
**原因：** 认证检查逻辑有问题

**解决方案：**
- 确保所有受保护页面重定向到首页 (`/`)
- 确保首页不会自动重定向未登录用户

---

## 📊 页面认证状态

| 页面 | 需要认证 | 未认证时重定向 | 说明 |
|------|---------|---------------|------|
| `/` (首页) | ❌ 否 | - | 显示欢迎界面或自动跳转 |
| `/auth/signin` | ❌ 否 | - | 登录页面 |
| `/auth/signup` | ❌ 否 | - | 注册页面 |
| `/dashboard` | ✅ 是 | `/` | 主仪表板 |
| `/plans` | ✅ 是 | `/` | 计划管理 |
| `/focus` | ✅ 是 | `/` | 专注页面 |
| `/onboarding` | ✅ 是 | `/` | 引导流程 |

---

## 🎯 最佳实践

### 1. 统一重定向目标
所有受保护页面的未认证重定向都应该指向首页 (`/`)，而不是登录页。

### 2. 使用 router.push 而不是 window.location.href
```typescript
// ❌ 不推荐
window.location.href = '/auth/signin';

// ✅ 推荐
router.push('/');
```

### 3. 清晰的日志
```typescript
console.log('❌ 未认证，重定向到首页');
```

### 4. 避免循环重定向
- 首页不应该自动重定向未登录用户到登录页
- 登录页不应该自动重定向已登录用户到 dashboard
- Dashboard 不应该重定向到登录页（应该重定向到首页）

---

## ✅ 验证清单

- [x] Dashboard 未认证时重定向到首页
- [x] Plans 页面未认证时重定向到首页
- [x] 退出登录后显示首页欢迎界面
- [x] 首页不会造成重定向循环
- [x] 登录后正确跳转到 dashboard
- [x] 刷新页面不会丢失认证状态

---

**修复日期：** 2025-12-26  
**影响范围：** 登录登出流程、页面访问控制  
**状态：** ✅ 已修复并测试





