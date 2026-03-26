# Polytrack.best 技术环境与配置

## 技术栈概览

### 前端技术
- **HTML5**: 语义化标记，SEO友好结构
- **CSS**: TailwindCSS框架 (本地构建)
- **JavaScript**: 原生JS，最小化使用
- **响应式**: 移动端优先设计

### 外部依赖
- **游戏引擎**: Kodub的Polytrack游戏 (iframe嵌入)
- **样式框架**: TailwindCSS (本地构建)
- **字体**: 系统默认字体栈
- **图标**: 暂无图标库依赖

### 部署环境
- **托管方式**: 静态文件托管
- **域名**: polytrack.best
- **CDN**: 可配置CDN加速
- **HTTPS**: 必须支持HTTPS

## 开发环境配置

### 本地开发
```bash
# 项目结构
polytrack.best/
├── index.html              # 主页面文件
├── project-requirements.md # 需求文档
├── seo-strategy.md        # SEO策略
├── memory-bank/           # 项目记忆库
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   ├── activeContext.md
│   └── progress.md
└── assets/ (计划中)
    ├── logo.svg
    └── og-cover.jpg
```

### 开发工具要求
- **代码编辑器**: 支持HTML/CSS/JS的现代编辑器
- **浏览器**: Chrome/Firefox/Safari/Edge (测试用)
- **本地服务器**: 可选，用于本地预览
- **版本控制**: Git (推荐)

### 环境变量
当前项目无需环境变量配置，所有配置直接写在HTML中。

## 技术决策记录

### 1. CSS框架选择: TailwindCSS

#### 选择原因
- **快速开发**: 实用优先的CSS类名
- **响应式**: 内置响应式设计支持
- **可定制**: 高度可配置的设计系统
- **性能**: 可purge未使用的样式

#### 当前实现
```html
<!-- 本地构建引用 (生产环境) -->
<link rel="stylesheet" href="assets/styles.css">
```

#### 升级计划
```bash
# 第二阶段: 本地构建
npm install -D tailwindcss
npx tailwindcss init
npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch
```

### 2. JavaScript最小化策略

#### 设计原则
- **渐进增强**: 核心功能不依赖JS
- **性能优先**: 减少JS包大小
- **可维护性**: 简单直接的实现

#### 当前使用
```javascript
// 仅用于动态年份显示
document.getElementById('y').textContent = new Date().getFullYear();

// iframe加载完成回调
onload="document.getElementById('game-shell')?.classList.remove('skeleton')"
```

### 3. 游戏集成方案: iframe嵌入

#### 技术选择
```html
<iframe
  title="Polytrack Online Racing Game"
  src="https://app-polytrack.kodub.com/0.5.1/?"
  loading="eager"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
  allowfullscreen
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
```

#### 优化配置
- **预连接**: 加速游戏域名解析
- **固定比例**: 防止CLS布局偏移
- **权限控制**: 精确的iframe权限配置
- **安全策略**: 严格的referrer策略

### 4. SEO技术实现

#### Meta标签配置
```html
<title>Polytrack - Play Online Racing Game | Build Custom Tracks</title>
<meta name="description" content="Play Polytrack online - the ultimate racing game where you build custom tracks and race against time." />
<link rel="canonical" href="https://polytrack.best/" />
<meta name="robots" content="index, follow" />
```

#### 结构化数据
- **WebSite**: 站点基本信息
- **WebPage**: 页面信息
- **VideoGame**: 游戏实体描述
- **FAQPage**: FAQ结构化数据

#### 性能优化
```html
<!-- 关键资源预加载 -->
<link rel="preconnect" href="https://app-polytrack.kodub.com" crossorigin />
<link rel="dns-prefetch" href="//app-polytrack.kodub.com" />

<!-- 关键CSS内联 -->
<style>
  .game-aspect { position: relative; width: 100%; padding-top: 75%; }
  .skeleton { /* 骨架屏样式 */ }
</style>
```

## 性能配置

### Core Web Vitals优化

#### LCP (Largest Contentful Paint)
- **目标**: < 2.5秒
- **优化**: 预连接游戏域名，关键CSS内联
- **监控**: 游戏iframe作为LCP元素

#### FID (First Input Delay)
- **目标**: < 100毫秒
- **优化**: 最小化JavaScript执行
- **策略**: 延迟非关键脚本加载

#### CLS (Cumulative Layout Shift)
- **目标**: < 0.1
- **优化**: 固定比例的iframe容器
- **实现**: CSS aspect-ratio技术

### 缓存策略

#### 浏览器缓存
```html
<!-- 静态资源缓存 -->
<meta http-equiv="Cache-Control" content="public, max-age=31536000">
```

#### CDN配置
- **TailwindCSS**: 使用官方CDN
- **游戏资源**: 依赖Kodub的CDN
- **静态文件**: 可配置自定义CDN

### 网络优化

#### 资源优先级
1. **关键CSS**: 内联在HTML中
2. **游戏iframe**: 设置loading="eager"
3. **TailwindCSS**: CDN加载
4. **非关键JS**: 延迟加载

#### 压缩配置
- **HTML**: 生产环境压缩
- **CSS**: TailwindCSS自动优化
- **图片**: 计划使用WebP/AVIF格式

## 安全配置

### Content Security Policy
```html
<!-- 计划实施的CSP配置 -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               frame-src https://app-polytrack.kodub.com; 
               style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
               script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;">
```

### iframe安全
- **沙箱**: 适当的sandbox属性
- **权限**: 精确的allow属性配置
- **来源**: 严格的referrerpolicy设置

### 数据保护
- **无用户数据**: 当前不收集用户个人信息
- **第三方**: 仅iframe嵌入游戏，无其他第三方脚本
- **隐私**: 计划添加隐私政策页面

## 监控与分析

### 性能监控
```javascript
// 计划实施的性能监控
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    // 监控Core Web Vitals
  });
  observer.observe({entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']});
}
```

### 错误监控
- **JavaScript错误**: 全局错误处理
- **资源加载**: 监控关键资源加载状态
- **iframe状态**: 监控游戏加载成功率

### 用户分析
- **Google Analytics**: 计划集成GA4
- **搜索控制台**: Google Search Console配置
- **热力图**: 可选的用户行为分析工具

## 部署配置

### 静态托管要求
- **HTTPS**: 必须支持SSL/TLS
- **自定义域名**: polytrack.best
- **压缩**: Gzip/Brotli压缩支持
- **缓存**: 适当的缓存头配置

### CI/CD流程 (计划)
```yaml
# 示例GitHub Actions配置
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build CSS
        run: npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify
      - name: Deploy
        run: # 部署到托管服务
```

### 环境配置
- **开发环境**: 本地文件系统或本地服务器
- **测试环境**: 可选的staging环境
- **生产环境**: 静态文件托管服务

## 技术债务与升级计划

### 当前技术债务
1. **TailwindCSS CDN**: 已完成迁移至本地构建 ✅
2. **缺少图像资源**: logo.svg和og-cover.jpg待创建
3. **无构建流程**: 需要建立自动化构建
4. **无监控系统**: 需要集成性能和错误监控

### 升级优先级

#### 高优先级 (第二阶段)
1. **本地CSS构建**: 减少外部依赖，提升性能
2. **图像资源**: 创建品牌logo和社交分享图
3. **性能监控**: 集成基础的性能监控

#### 中优先级 (第三阶段)
1. **PWA功能**: 添加Service Worker和离线支持
2. **高级监控**: 用户行为分析和错误追踪
3. **自动化部署**: CI/CD流程建立

#### 低优先级 (未来考虑)
1. **框架迁移**: 考虑React/Vue等现代框架
2. **微前端**: 模块化架构升级
3. **边缘计算**: CDN边缘功能利用

## 开发规范

### 代码规范
- **HTML**: 语义化标签，可访问性属性
- **CSS**: TailwindCSS类名，响应式优先
- **JavaScript**: ES6+语法，最小化使用
- **注释**: 关键逻辑添加注释

### 文件组织
- **单文件**: 当前所有代码在index.html中
- **资源分离**: 计划分离CSS和JS到独立文件
- **文档**: 完整的Memory Bank文档系统

### 版本控制
- **Git**: 使用语义化提交信息
- **分支**: main分支用于生产，develop用于开发
- **标签**: 使用语义化版本号

---

**创建日期**: 2025年1月12日  
**最后更新**: 2025年1月12日  
**文档版本**: v1.0  
**技术栈版本**: HTML5 + TailwindCSS CDN + 原生JS