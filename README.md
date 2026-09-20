# 薰逸の猫窝

> 一只在薰衣草香里敲代码的猫。

🌐 **线上地址**：<https://xunyi.cloud>

基于 [astro-koharu](https://github.com/cosZone/astro-koharu) 主题深度定制的个人博客：白天是初音绿，晚上是薰衣草紫，进门先经过一块会折射的液态玻璃。

## 关于本站

- 纯静态输出，部署在 **Cloudflare Pages**，全球 CDN 加速
- 文章阅读量由 **Cloudflare Workers + KV** 提供（无后端框架、无数据库）
- 全站配图统一压缩为 WebP，参考封面 1.9MB 封顶
- 站内搜索基于 [Pagefind](https://pagefind.app/)，零后端

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Astro 7（静态输出）+ React 19 岛屿 |
| 样式 | Tailwind CSS 4 + 自定义设计 token |
| 内容 | Astro Content Collections（Markdown / MDX） |
| 搜索 | Pagefind（构建期索引） |
| 音乐 | Meting API（网易云歌单） |
| 统计 | Cloudflare Web Analytics + Workers/KV 阅读量 |
| 部署 | Cloudflare Pages（Git 集成自动构建） |

## 本站的三个「折腾点」

### 1. macOS 风格液态玻璃开屏页

根路径 `/` 不是文章列表，而是一个开屏页（`src/features/splash/`）：

- **液态玻璃 Dock**：canvas 逐像素绘制位移图 + SVG `feDisplacementMap` 折射滤镜，指针移动时图标惯性放大、相邻间距动态挤压、玻璃底座随强度膨胀
- **视差封面**：鼠标驱动的 3D 视差 + 双图轮播（只渲染当前图并预热下一张）
- **迷你音乐播放器**：网易云歌单、歌词滚动高亮、跨页面进度续播
- **主题切换**：与博客共用 `localStorage.theme`，带渐变扫过动画

实现细节写了一篇长文：《把苹果的液态玻璃搬进网页：从毛玻璃到真·液态玻璃的完整实现》。

### 2. 双主题：初音绿 / 薰衣草紫

| | 白天 | 夜间 |
|---|---|---|
| 主题色 | 初音绿 `#39c5bb` | 薰衣草紫 `#c084fc` |
| 玻璃 | 白色半透明毛玻璃 | 深色玻璃 |
| 封面 | 原图 | 轻微压暗 |

- 跟随系统外观自动切换（macOS「自动」模式晚上自动转深色），也可手动切换
- 主题色通过 CSS 变量统一下发，`--primary`、`--color-pink`、Dock 图标等都随主题两态变化

### 3. 全站统一的音乐系统

歌单只有一个数据源：`config/site.yaml` 的 `bgm.audio`。开屏顶栏播放器、博客顶栏迷你播放器、右下角 BGM 悬浮面板、`/music` 歌单页**全部读同一份配置**，改一处全站生效。

## 本地开发

```bash
pnpm install          # 安装依赖（Node ≥ 22.20）
pnpm dev              # 开发服务器 http://localhost:4321
pnpm build            # 生产构建（输出 dist/）
pnpm preview          # 预览构建产物
pnpm check            # Astro + TypeScript 检查
pnpm lint             # Biome 检查与格式化
pnpm generate:lqips   # 重新生成图片 LQIP 占位
```

> ⚠️ `config/site.yaml` 在 dev 启动时会被缓存，**改完必须重启 dev server** 才生效。

## 写作与配置

### 写一篇新文章

新建 `src/content/blog/<分类>/<英文短名>.md`：

```yaml
---
title: "文章标题"
link: note/front-end/my-post      # 固定 URL（建议与文件路径一致）
date: 2026-08-30
categories: ['笔记', '前端']        # 分类需在 site.yaml 的 categoryMap 中
math: true                        # 需要 LaTeX 公式时开启（行内 $...$，块级 $$...$$）
sticky: true                      # 可选：首页置顶
description: "文章摘要"
---
```

配图放进 `public/img/posts/<文章路径>/`，用 `/img/posts/...` 引用（不要外链图床，防盗链会让图片挂掉）。

### 常用配置项

| 配置 | 位置 |
|---|---|
| 站点信息、导航、分类映射 | `config/site.yaml` |
| 开屏页文案 / 背景图 / Dock 项 | `src/features/splash/lib/copy.ts` |
| 歌单（网易云） | `config/site.yaml` → `bgm.audio` |
| 友链 | `config/site.yaml` → `friends.data` |
| 追番（Bangumi） | `config/site.yaml` → `bangumi.userId` |

## 部署

站点部署在 Cloudflare Pages + 自定义域名 `xunyi.cloud`：

| 项 | 值 |
|---|---|
| Build command | `pnpm build` |
| Output directory | `dist` |
| Node 版本 | 22（见 `.nvmrc`） |

完整步骤（含阅读量 Worker、Web Analytics、自定义域名）见 [`docs/deploy/cloudflare.md`](./docs/deploy/cloudflare.md)。阅读量 Worker 位于 [`deploy/cf-view-counter/`](./deploy/cf-view-counter/)。

## 目录结构（本站相关）

```text
src/
├── features/splash/          # 开屏页模块（组件 / 文案 / 液态玻璃工具 / 样式）
├── components/music/         # 博客顶栏迷你播放器
├── components/layout/        # 顶栏、页脚、搜索弹窗、HeaderGlass
├── lib/liquidGlass.ts        # 液态玻璃滤镜引擎（canvas + SVG feDisplacementMap）
├── lib/cf/post-views.ts      # 阅读量前端客户端
├── content/blog/             # 文章（按分类分目录）
└── styles/                   # 主题 token、液态玻璃样式、播放器样式
deploy/cf-view-counter/       # 阅读量 Worker（Cloudflare Workers + KV）
docs/deploy/cloudflare.md     # Cloudflare 部署指南
```

## 鸣谢

- 主题：[astro-koharu](https://github.com/cosZone/astro-koharu)（by [cosZone](https://blog.cosine.ren/)），设计灵感来自 Hexo 的 [Shoka](https://shoka.lostyu.me/) 主题
- 图标：[Iconify](https://icon-sets.iconify.design/)（Remix Icon / Font Awesome）
- 搜索：[Pagefind](https://pagefind.app/)
- 音乐接口：[Meting API](https://github.com/metowolf/Meting)

## License

代码基于原主题的 MIT License 发布；文章内容版权归本站作者所有，转载请注明出处。
