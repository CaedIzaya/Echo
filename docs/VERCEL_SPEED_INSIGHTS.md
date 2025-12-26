# Vercel Speed Insights 集成

## ✅ 已集成

Vercel Speed Insights 已成功添加到项目中。

### 集成位置

**文件：** `src/pages/_app.tsx`

```typescript
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      {/* ... */}
      <SpeedInsights />
    </SessionProvider>
  );
}
```

---

## 📊 功能说明

### Speed Insights 是什么？

Vercel Speed Insights 是一个**实时性能监控工具**，用于分析你的应用在真实用户环境中的性能表现。

### 主要功能

1. **真实用户监控 (RUM)**
   - 收集真实用户的性能数据
   - 分析页面加载时间、交互延迟等指标

2. **核心 Web Vitals**
   - **LCP (Largest Contentful Paint)** - 最大内容绘制时间
   - **FID (First Input Delay)** - 首次输入延迟
   - **CLS (Cumulative Layout Shift)** - 累积布局偏移

3. **性能指标**
   - 页面加载时间
   - 资源加载时间
   - 网络请求性能

4. **可视化仪表板**
   - 在 Vercel 仪表板中查看性能数据
   - 识别性能瓶颈
   - 跟踪性能趋势

---

## 🚀 如何使用

### 1. 部署到 Vercel

Speed Insights 只在 **Vercel 生产环境**中工作：

```bash
vercel --prod
```

### 2. 查看性能数据

1. 登录 [Vercel 仪表板](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Analytics** 或 **Speed Insights** 标签
4. 查看实时性能数据

### 3. 性能优化

根据 Speed Insights 提供的数据：
- 识别慢速页面
- 优化资源加载
- 改善用户体验

---

## 🔧 配置选项

### 自定义采样率

默认情况下，Speed Insights 会收集所有用户的性能数据。你可以自定义采样率：

```typescript
<SpeedInsights sampleRate={0.5} /> // 只收集 50% 的用户数据
```

### 禁用特定路由

```typescript
<SpeedInsights 
  route="/admin" 
  disabled={true} 
/>
```

### 完整配置示例

```typescript
<SpeedInsights
  sampleRate={1.0}        // 采样率：0.0 - 1.0
  framework="nextjs"     // 框架类型
  route="/"              // 路由路径
/>
```

---

## 📈 性能指标说明

### Core Web Vitals

#### LCP (Largest Contentful Paint)
- **目标：** < 2.5 秒
- **测量：** 最大内容元素渲染完成的时间
- **优化：** 优化图片、字体、关键 CSS

#### FID (First Input Delay)
- **目标：** < 100 毫秒
- **测量：** 用户首次交互到浏览器响应的延迟
- **优化：** 减少 JavaScript 执行时间

#### CLS (Cumulative Layout Shift)
- **目标：** < 0.1
- **测量：** 页面布局的稳定性
- **优化：** 为图片和广告设置尺寸，避免动态内容插入

---

## 🎯 最佳实践

### 1. 监控关键页面

重点关注：
- 首页加载时间
- 用户主要操作流程
- 高流量页面

### 2. 定期检查

- 每周查看一次性能报告
- 关注性能趋势变化
- 及时优化性能下降的页面

### 3. 结合其他工具

Speed Insights 可以与其他工具结合使用：
- **Vercel Analytics** - 用户行为分析
- **Web Vitals** - 浏览器性能 API
- **Lighthouse** - 性能审计工具

---

## 🔍 调试

### 开发环境

Speed Insights **不会**在开发环境中收集数据（`npm run dev`）。

### 生产环境

确保：
1. ✅ 应用已部署到 Vercel
2. ✅ 使用生产环境 URL 访问
3. ✅ 等待几分钟让数据收集和显示

### 验证集成

在浏览器控制台检查：
```javascript
// Speed Insights 会在 window 对象上添加一些属性
console.log('Speed Insights loaded:', window.__VERCEL_SPEED_INSIGHTS__);
```

---

## 📚 相关文档

- [Vercel Speed Insights 文档](https://vercel.com/docs/speed-insights)
- [Core Web Vitals](https://web.dev/vitals/)
- [Web Performance](https://web.dev/performance/)

---

## ⚠️ 注意事项

1. **隐私保护**
   - Speed Insights 只收集性能数据，不收集用户个人信息
   - 符合 GDPR 和隐私法规

2. **性能影响**
   - Speed Insights 对性能的影响极小（< 1KB）
   - 异步加载，不会阻塞页面渲染

3. **数据收集**
   - 只在 Vercel 生产环境中工作
   - 需要用户访问你的应用才能收集数据

---

**集成日期：** 2025-12-26  
**版本：** @vercel/speed-insights@1.3.1

