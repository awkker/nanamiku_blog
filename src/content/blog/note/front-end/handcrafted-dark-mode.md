---
link: note/front-end/handcrafted-dark-mode
title: "手搓深色模式：一行 CSS 类的轻量级无依赖方案（支持 iframe 同步）"
date: 2026-08-30
categories: ['笔记', '前端']
---
在现代 Web 开发中，深色模式（Dark Mode）几乎成了标配。虽然有很多 UI 库自带这个功能，但作为一个喜欢掌控细节的开发者，自己“手搓”一套方案不仅代码量小，而且能完全满足定制化需求（比如复杂的 `iframe` 嵌套场景）。

今天就来分享一套**轻量级、无依赖、支持 iframe 同步**的深浅色模式切换方案。

## 核心原理：一行 CSS 类的魔法

我们的实现逻辑非常简单粗暴但有效：
**通过给 `<body>` 标签添加一个 `dark-mode` 类来控制全局样式。**

  * **默认状态**：`<body>` 无类名 -\> 浅色模式。
  * **深色状态**：`<body>` 有 `.dark-mode` 类名 -\> 深色模式。

## 第一步：CSS 样式的分层设计

为了维护方便，我们建议采用**覆盖式**写法。默认写浅色样式，然后通过 CSS 优先级覆盖深色样式。

```css
/* === 默认样式 (浅色模式) === */
.article-card {
    background: #fff;
    color: #333;
    transition: background 0.3s, color 0.3s; /* 加上过渡动画更丝滑 */
}

/* === 深色模式 (覆盖样式) === */
/* 核心技巧：利用 body.dark-mode 提高权重 */
body.dark-mode .article-card {
    background: #2a2a2a;
    color: #f0f0f0;
}
```

> **提示**：如果你的项目很大，建议将深色样式拆分到单独的文件中，便于管理。

## 第二步：JavaScript 逻辑核心

我们需要一个“大脑”来处理三个任务：

1.  **切换**：点击按钮修改 `class`。
2.  **记忆**：使用 `localStorage` 记住用户的选择。
3.  **同步**：确保刷新页面后主题不丢失。

在你的全局 JS 文件（例如 `navbar.js`）中加入以下逻辑：

### 1\. 页面加载时的自动检测

```javascript
// 页面加载瞬间，立即读取偏好
// 放在 DOMContentLoaded 或 <head> 中可以减少闪烁
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
}
```

### 2\. 切换按钮的点击事件

```javascript
themeToggle.addEventListener('click', function() {
    // 1. 切换当前 body 的类
    const isDark = document.body.classList.toggle('dark-mode');
    
    // 2. 保存状态到本地存储
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // 3. 更新按钮文字或图标
    this.textContent = isDark ? '🌞' : '🌙';
    
    // 4. (进阶) 同步给子页面，见下文
    syncThemeToIframe(isDark);
});
```

## 第三步：攻克难点—— Iframe 跨页面同步

很多传统网页架构使用 `iframe` 来加载内容，这就导致了一个痛点：**主页变黑了，iframe 里面还是白的。**

我们需要实现主页面与 iframe 的双向通信。

### 场景 A：主页面控制 iframe（父传子）

当我们在主导航栏点击切换时，需要手动去抓取 iframe 的 DOM 并修改它：

```javascript
const syncThemeToIframe = (isDark) => {
    const iframe = document.getElementById('contentFrame');
    // 必须确保 iframe 已加载且同源
    if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
        // 同步 toggle 类名
        iframe.contentDocument.body.classList.toggle('dark-mode', isDark);
    }
};
```

### 场景 B：Iframe 加载时的自我感知（子查父/存储）

当 iframe 里的页面被刷新或跳转时，它需要知道当前是什么模式。

**方法 1：读取共享的 LocalStorage（推荐）**
只要 iframe 和主页面同源（Domain 相同），它们共享 `localStorage`。
在 iframe 内部引用的 JS 中：

```javascript
// iframe 内部脚本
document.addEventListener('DOMContentLoaded', function() {
    // 直接读取统一的存储键值
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
});
```

**方法 2：监听主框架的消息（更严谨）**
在主页面的 `main-frame.js` 中监听 iframe 的加载事件：

```javascript
iframe.addEventListener('load', () => {
    // 只要主页面是黑的，加载完新的 iframe 页面后，强制把它也变黑
    const isParentDark = document.body.classList.contains('dark-mode');
    if (isParentDark) {
        iframe.contentDocument.body.classList.add('dark-mode');
    }
});
```

## 效果展示

![](/img/posts/note/front-end/handcrafted-dark-mode/6dfa6ea68709aad6d6bfae6257532238.webp)
![](/img/posts/note/front-end/handcrafted-dark-mode/b817b52e27e981fc84851a4793349b62.webp)

## 总结与数据流图

这一套方案的数据流向非常清晰：

1.  **用户动作** -\> 触发 JS 事件。
2.  **DOM 操作** -\> 实时修改 CSS 类（视觉反馈）。
3.  **持久化** -\> 写入 `localStorage`（防止刷新丢失）。
4.  **传递** -\> 穿透 `iframe` 边界同步状态。

```text
用户点击 
   ↓
[主页面 body 变黑] ──(同步)──> [Iframe body 变黑]
   ↓
[写入 localStorage]
   ↓
(用户刷新页面)
   ↓
[读取 localStorage] ──> [恢复深色模式]
```

## 注意事项

1.  **同源策略**：iframe 操作 `contentDocument` 或共享 `localStorage` 必须要求主页面和子页面在同一个域名下。
2.  **样式优先级**：切记深色模式的 CSS 选择器权重必须高于默认样式（使用 `body.dark-mode .class` 即可完美解决）。
3.  **闪烁问题**：将读取 `localStorage` 的脚本放在 HTML 的 `<head>` 底部执行，可以最大程度避免页面先白后黑的“闪烁”现象。

-----

希望这篇教程能帮你轻松搞定网页的“夜间模式”！快去试试吧！

---
