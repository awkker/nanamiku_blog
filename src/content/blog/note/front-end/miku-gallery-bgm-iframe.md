---
link: note/front-end/miku-gallery-bgm-iframe
title: "初音画廊 BGM 进化史：从 APlayer 到 iframe 架构"
date: 2026-08-30
categories: ['笔记', '前端']
---
> **前言**
> 最近在搓我的 Web 期末大作业——一个初音未来（Miku）主题的画廊网站。页面做得很漂亮，但总觉得少了点灵魂……没错，是 BGM！
> 本以为加个播放器很简单，结果没想到为了实现“切换页面音乐不断”，我把整个网站的架构都重构了一遍。今天就来分享一下这个从 APlayer 到 iframe 架构的进化过程。
​
## 第一阶段：初见 APlayer
​
为了给我的“Miku 画廊”加上音乐，我选中了颜值超高的开源播放器 **APlayer**。
​
### 1\. 引入播放器
​
这个步骤很简单，不用 npm，直接用 CDN 引入 CSS 和 JS 就能用，非常适合我们这种交作业的静态页面项目。
​
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.css">
<script src="https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.js"></script>
```
​
### 2\. 初始化
​
我在页面底部加了一个 `<div id="aplayer"></div>`，然后写了段 JS：
​
```javascript
const ap = new APlayer({
    container: document.getElementById('aplayer'),
    fixed: true,          // 开启吸底模式，让它一直悬浮在左下角
    theme: '#39c5bb',     // Miku专属的葱绿色！
    audio: [
        {
            name: 'World is Mine',
            artist: 'Hatsune Miku',
            url: 'music/world_is_mine.mp3',
            cover: 'img/miku_cover.jpg'
        }
    ]
});
```
​
**效果：** 页面一打开，左下角就出现了播放器，点击播放，Miku 的歌声就出来了。完美？并没有。
​
-----
​
## 第二阶段：遇到的痛点
​
我兴奋地点击导航栏去查看“精选展厅”页面，结果……
**音乐停了！** 😱
​
**原因分析：**
传统的网页跳转（`a href="page2.html"`）本质上是浏览器**销毁当前页面，加载新页面**。
当前页面被销毁了，依附在页面上的 JS 播放器自然也就“挂了”。到了新页面，播放器重新初始化，音乐又从头开始放。
​
这对于听歌体验来说简直是灾难！我想要的是网易云音乐那种“页面随便切，歌声永流传”的效果。
​
-----
​
## 第三阶段：重构！iframe 主框架大法
​
为了解决这个问题，我参考了大佬的思路，决定使用 **iframe（内嵌框架）** 技术。
​
### 核心思路
​
把网页拆成“外壳”和“内容”两部分：
​
1.  **外壳 (Shell)**：包含侧边导航栏 + 音乐播放器。**这个外壳永远不会刷新**。
2.  **内容 (Content)**：用一个 `<iframe>` 标签来显示具体的子页面（如首页、画廊页）。切换页面时，只替换 iframe 里的链接。
​
### 1\. 文件结构调整
​
我重新规划了项目结构：
​
```plain
static/
├── css/
│   ├── main-frame.css      # 专门给iframe布局用的
│   └── navbar.css          # 导航栏样式
├── html/
│   ├── main.html           # 【新入口】主框架外壳
│   ├── index.html          # 原来的首页（现在变成子页面）
│   └── ...                 # 其他页面
└── js/
    ├── main-frame.js       # 控制iframe切换
    └── music_aplayer.js    # 播放器配置
```
​
### 2\. 编写主框架 (main.html)
​
这是整个系统的核心。我在 `main.html` 里写了这样的布局：
​
```html
<body>
    <iframe src="index.html" id="contentFrame" class="content-frame" name="contentFrame"></iframe>
​
    <div id="aplayer"></div>
​
    <script src="../js/navbar.js"></script>
    <script src="../js/main-frame.js"></script>
    <script src="../js/music_aplayer.js"></script>
</body>
```
​
### 3\. CSS 布局魔法 (main-frame.css)
​
为了让 iframe 看起来不像个旧时代的网页，我们需要去掉它的边框，并处理好层级关系（z-index）：
​
```css
.content-frame {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100%; height: 100%;
    border: none;
    z-index: 1; /* 层级最低，在最底层 */
    transition: left 0.3s ease; /* 加个动画，侧边栏展开时丝滑移动 */
}
```
​
同时，侧边栏的 `z-index` 设为 1000，播放器的 `fixed` 模式会自动处理层级，确保它们浮在内容之上。
​
### 4\. 让导航栏控制 iframe (main-frame.js)
​
最关键的一步，不能让 `<a>` 标签直接跳转，而是要拦截点击事件，把目标地址赋给 iframe：
​
```javascript
// 伪代码逻辑
link.addEventListener('click', function(e) {
    e.preventDefault(); // 阻止浏览器跳转
    const targetUrl = this.getAttribute('href');
    // 修改 iframe 的地址，实现页面局部刷新
    document.getElementById('contentFrame').src = targetUrl;
});
```
​
-----
​
## ✨ 最终效果
​
现在，我的大作业变成了这样：
​
1.  **打开 `main.html`**：首先看到首页，音乐播放器就位。
![](/img/posts/note/front-end/miku-gallery-bgm-iframe/f58ef215acbdf320535b82b08c2184b2.webp)
2.  **点击“画师副展厅”**：
      * 浏览器地址栏不变。
      * 页面中间的内容平滑变成了新页面。
      * **左下角的 APlayer 进度条还在继续走，Miku 的歌声完全没有中断！** 3.  **响应式适配**：在手机上，侧边栏会自动变成遮罩模式，iframe 保持不动，体验非常 App 化。
​
## 📝 踩坑总结
​
1.  **路径问题**：音乐文件的路径要基于 `main.html` 的位置写（比如 `../images/music/xxx.mp3`），而不是子页面。
2.  **子页面导航**：因为子页面被嵌在 iframe 里，如果不做处理，子页面里可能又会显示一个导航栏。我在 `navbar.js` 里加了个判断 `if (window.self !== window.top)`，如果是被嵌套的页面，就自动隐藏导航栏。
3.  **LRC 歌词**：APlayer 支持 `.lrc` 文件，只要配置好 `lrcType: 3`，歌词就能跟着动，这波大作业稳了！
​
-----
​
> **结语**
> 虽然只是加个播放器，却逼着我学懂了 iframe 和单页应用（SPA）的雏形逻辑。看到网页在切换时那丝滑的体验，感觉一切折腾都值了！
>
> Ciallo～(∠・ω\< )⌒★ 下次继续折腾！
