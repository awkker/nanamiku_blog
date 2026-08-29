---
link: note/front-end/handcrafted-markdown-renderer
title: "手搓 Markdown 渲染器：Fetch API 与三个经典工具库的安全渲染流水线"
date: 2026-08-30
categories: ['笔记', '前端']
---
在现代前端开发中，我们习惯了用 React、Vue 配合各种复杂的插件来渲染内容。但有时，我们只是想在一个简单的静态网页上展示一篇 README 或技术文档，引入一套重型框架显得有些“杀鸡用牛刀”。

今天，我们就回归本源，利用浏览器原生的 **Fetch API** 配合三个经典的工具库，**手搓**一个安全、漂亮且支持代码高亮的 Markdown 渲染器。

## 核心架构：渲染流水线

要在网页上把 Markdown 变成 HTML，其实就是建立一条数据处理的“流水线”。整个过程可以分为四个步骤：

1. **取货 (Fetch)**：通过网络请求获取 `.md` 文件的纯文本内容。
2. **翻译 (Parse)**：将 Markdown 语法转换成 HTML 字符串（使用 `marked`）。
3. **安检 (Sanitize)**：清洗 HTML，移除恶意脚本防止 XSS 攻击（使用 `DOMPurify`）。
4. **装修 (Highlight & Style)**：给代码块上色，并应用排版样式（使用 `highlight.js` 和 GitHub CSS）。

## 1. 准备工具 (The Stack)

我们要用到三个“前端老字号”库，直接通过 CDN 引入，无需 npm 安装，无需打包。

- **Marked**: 负责核心的 Markdown 解析，速度快，体积小。
- **DOMPurify**: 负责安全。**（极其重要）** 因为 Markdown 允许嵌入 HTML，如果不清洗，黑客可以直接写入 `<script>` 攻击你的用户。
- **Highlight.js**: 负责自动检测代码语言并高亮。

## 2. 核心代码实现

### 第一步：引入资源

除了 JS 库，为了让排版好看，我们直接引入 **GitHub Markdown CSS**，让你的文章看起来像在 GitHub 上一样专业。


```plain
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown-light.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.8/purify.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
```

### 第二步：编写渲染逻辑

这是整个引擎的心脏。我们通过 `fetch` 读取本地或远程的文件，然后依次调用库函数进行处理。


```plain
const contentDiv = document.getElementById('content');
const mdUrl = './post.md'; // 你的文件路径

fetch(mdUrl)
    .then(response => {
        if (!response.ok) throw new Error("文件加载失败 QAQ");
        return response.text(); // 拿到纯文本
    })
    .then(text => {
        // 1. 翻译：Markdown -> HTML
        const dirtyHtml = marked.parse(text);

        // 2. 安检：清洗脏代码 (防 XSS)
        const cleanHtml = DOMPurify.sanitize(dirtyHtml);

        // 3. 上架：插入页面
        contentDiv.innerHTML = cleanHtml;

        // 4. 装修：代码高亮
        contentDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    })
    .catch(err => {
        console.error(err);
        contentDiv.innerHTML = `<p style="color:red">加载出错了: ${err.message}</p>`;
    });
```

------

## 3. 常见坑点：CORS 跨域

很多新手在写这段代码时，会直接双击 `index.html` 打开，然后发现控制台报错：

> *Access to fetch at 'file://...' from origin 'null' has been blocked by CORS policy.*

原因：出于安全策略，浏览器禁止网页直接通过 file:// 协议读取硬盘文件。

解决：你必须启动一个本地 HTTP 服务器。

- **VS Code 用户**：安装 "Live Server" 插件，右键点击 HTML 文件选择 "Open with Live Server"。
- **Python 用户**：终端运行 `python -m http.server`。

------

## 完整演示代码

你可以新建一个 `index.html`，同级目录下放一个 `post.md`，然后把下面的代码复制进去体验。


```plain
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>原生 Markdown 渲染器 Demo</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown-light.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">

    <style>
        body {
            background-color: #f6f8fa;
            padding: 20px;
            font-family: -apple-system, sans-serif;
        }
        
        /* 模拟一张 A4 纸的阅读体验 */
        .page-container {
            max-width: 850px;
            margin: 0 auto;
            background: white;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        /* 必须加上这个类名，github-markdown-css 才会生效 */
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 100%;
        }

        .loading { text-align: center; color: #666; margin-top: 50px; }
    </style>
</head>
<body>

    <div class="page-container">
        <div id="content" class="markdown-body">
            <div class="loading">正在加载文章... (∠・ω< )⌒★</div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.8/purify.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

    <script>
        // 配置：你的 Markdown 文件路径
        const FILE_PATH = './post.md'; 

        const contentDiv = document.getElementById('content');

        // 开始加载
        fetch(FILE_PATH)
            .then(response => {
                if (!response.ok) throw new Error(`状态码 ${response.status}`);
                return response.text();
            })
            .then(text => {
                // 1. Parse: 转换
                const rawHtml = marked.parse(text);
                
                // 2. Sanitize: 清洗 (安全第一!)
                const safeHtml = DOMPurify.sanitize(rawHtml);
                
                // 3. Render: 注入
                contentDiv.innerHTML = safeHtml;
                
                // 4. Highlight: 高亮代码块
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            })
            .catch(error => {
                console.error(error);
                contentDiv.innerHTML = `
                    <div style="text-align:center; color:#cf222e;">
                        <h3>加载失败</h3>
                        <p>${error.message}</p>
                        <small>提示：请确保使用了 Live Server 或本地服务器运行</small>
                    </div>
                `;
            });
    </script>
</body>
</html>
```

## 总结

看，我们没有使用任何复杂的构建工具（Webpack/Vite），仅用了不到 50 行代码，就实现了一个功能完备的 Markdown 阅读器。

这种“手搓”的方式非常适合个人博客、简单的文档站点，或者通过这一过程去深入理解浏览器如何处理文本和 DOM。

Happy Coding! (∠・ω< )⌒★
