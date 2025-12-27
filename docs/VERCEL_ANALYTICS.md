# Vercel Analytics 集成

## ✅ 已集成

Vercel Analytics 已成功添加到项目中。

### 集成位置

**文件：** `src/pages/_app.tsx`

```typescript
import { Analytics } from "@vercel/analytics/next";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      {/* ... */}
      <Analytics />
      <SpeedInsights />
    </SessionProvider>
  );
}
```

---

## 📊 功能说明

### Analytics 是什么？

Vercel Analytics 是一个**用户行为分析工具**，用于追踪和分析你的应用在真实用户环境中的使用情况。

### 主要功能

1. **页面访问统计**
   - 页面浏览量（Page Views）
   - 独立访客数（Unique Visitors）
   - 访问时长（Time on Page）
   - 跳出率（Bounce Rate）

2. **用户行为分析**
   - 用户路径追踪
   - 热门页面排行
   - 用户来源分析
   - 设备类型统计

3. **实时数据**
   - 实时访客监控
   - 实时页面访问
   - 实时事件追踪

4. **可视化仪表板**
   - 在 Vercel 仪表板中查看分析数据
   - 图表和统计信息
   - 数据导出功能

---

## 🚀 如何使用

### 1. 部署到 Vercel

Analytics 只在 **Vercel 生产环境**中工作：

```bash
vercel --prod
```

### 2. 查看分析数据

1. 登录 [Vercel 仪表板](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Analytics** 标签
4. 查看实时和历史的分析数据

### 3. 分析用户行为

根据 Analytics 提供的数据：
- 了解用户最常访问的页面
- 分析用户行为模式
- 优化用户体验
- 识别需要改进的功能

---

## 🔧 配置选项

### 自定义事件追踪

Analytics 支持自定义事件追踪：

```typescript
import { track } from '@vercel/analytics';

// 追踪自定义事件
track('button_click', {
  button_name: 'Sign Up',
  location: 'header'
});
```

### 禁用特定路由

```typescript
<Analytics 
  mode="production"  // 只在生产环境启用
  beforeSend={(event) => {
    // 过滤特定事件
    if (event.url.includes('/admin')) {
      return null; // 不追踪管理页面
    }
    return event;
  }}
/>
```

### 完整配置示例

```typescript
<Analytics
  mode="production"        // 模式：production | development
  debug={false}            // 调试模式
  beforeSend={(event) => {
    // 自定义事件过滤逻辑
    return event;
  }}
/>
```

---

## 📈 分析指标说明

### 核心指标

#### Page Views（页面浏览量）
- **定义：** 用户访问页面的总次数
- **用途：** 了解哪些页面最受欢迎

#### Unique Visitors（独立访客）
- **定义：** 访问你网站的唯一用户数
- **用途：** 了解用户基数

#### Bounce Rate（跳出率）
- **定义：** 只访问一个页面就离开的用户比例
- **目标：** < 50%
- **优化：** 改善页面内容和用户体验

#### Average Session Duration（平均会话时长）
- **定义：** 用户平均在网站上停留的时间
- **用途：** 评估用户参与度

---

## 🎯 与 Speed Insights 的区别

### Analytics（用户行为分析）
- ✅ 追踪用户访问和页面浏览
- ✅ 分析用户行为模式
- ✅ 统计访问量和用户来源
- ✅ 了解哪些功能最受欢迎

### Speed Insights（性能监控）
- ✅ 追踪页面加载性能
- ✅ 分析 Core Web Vitals
- ✅ 监控真实用户性能数据
- ✅ 识别性能瓶颈

**两者互补：**
- Analytics 告诉你**用户做了什么**
- Speed Insights 告诉你**性能如何**

---

## 🔍 调试

### 开发环境

Analytics **不会**在开发环境中收集数据（`npm run dev`）。

### 生产环境

确保：
1. ✅ 应用已部署到 Vercel
2. ✅ 使用生产环境 URL 访问
3. ✅ 等待几分钟让数据收集和显示

### 验证集成

在浏览器控制台检查：
```javascript
// Analytics 会在 window 对象上添加一些属性
console.log('Analytics loaded:', window.__VERCEL_ANALYTICS__);
```

---

## 📚 相关文档

- [Vercel Analytics 文档](https://vercel.com/docs/analytics)
- [Vercel Speed Insights 文档](https://vercel.com/docs/speed-insights)
- [Web Analytics 最佳实践](https://vercel.com/docs/analytics/best-practices)

---

## ⚠️ 注意事项

1. **隐私保护**
   - Analytics 符合 GDPR 和隐私法规
   - 不收集个人身份信息（PII）
   - 数据匿名化处理

2. **性能影响**
   - Analytics 对性能的影响极小（< 1KB）
   - 异步加载，不会阻塞页面渲染

3. **数据收集**
   - 只在 Vercel 生产环境中工作
   - 需要用户访问你的应用才能收集数据
   - 数据存储在 Vercel 的服务器上

4. **免费额度**
   - Vercel 免费版包含 Analytics
   - 查看 [Vercel 定价](https://vercel.com/pricing) 了解详情

---

## 💡 最佳实践

### 1. 结合使用 Analytics 和 Speed Insights

同时使用两个工具可以获得完整的用户洞察：
- **Analytics** → 用户行为
- **Speed Insights** → 性能表现

### 2. 定期检查数据

- 每周查看一次分析报告
- 关注用户行为趋势
- 识别需要优化的页面

### 3. 基于数据优化

- 优化访问量高的页面
- 改善跳出率高的页面
- 提升用户参与度

---

## 🎉 功能特性

- ✅ 实时用户行为追踪
- ✅ 页面访问统计
- ✅ 用户路径分析
- ✅ 设备类型统计
- ✅ 来源分析
- ✅ 可视化仪表板
- ✅ 数据导出功能

---

**集成日期：** 2025-12-26  
**版本：** @vercel/analytics@1.6.1  
**状态：** ✅ 已集成并启用





