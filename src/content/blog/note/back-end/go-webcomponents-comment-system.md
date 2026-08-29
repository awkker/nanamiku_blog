---
link: note/back-end/go-webcomponents-comment-system
title: "无依赖全栈评论系统：Go (Gin) + Web Components 快速搭建"
date: 2026-08-30
categories: ['笔记', '后端']
---
想要给网站加个评论功能，接入第三方服务怕数据不安全，引入庞大的前端框架又觉得“杀鸡焉用牛刀”？

其实，利用浏览器现代标准 **Web Components** 和编译极其方便的 **Go 语言**，我们可以快速构建一个**无依赖、高性能**的全栈评论系统。它不需要复杂的构建流程，部署时只需一个二进制文件，非常适合个人开发者快速上手。

## 技术栈一览

  * **Backend (后端):** Go (Gin 框架) + Gorm + SQLite
    * *理由：部署极其简单，编译后只是一个二进制文件，自带数据库，无需额外安装 MySQL。*
  * **Frontend (前端):** 原生 JavaScript + Web Components
    * *理由：无依赖，无构建流程，标准 HTML 标签，真正的组件化。*

-----

## 第一部分：后端 —— 极速搭建 API

我们将使用 Go 语言最流行的 Gin 框架，配合 Gorm 进行数据库操作。整个后端代码不到 60 行。

### 1\. 初始化项目

首先，在终端中创建一个文件夹并初始化 Go 模块：

```bash
mkdir go-comments
cd go-comments
go mod init go-comments
```

安装必要的依赖包：

```bash
# Web 框架
go get -u github.com/gin-gonic/gin
# ORM 和 数据库驱动
go get -u gorm.io/gorm
go get -u gorm.io/driver/sqlite
# 跨域处理中间件
go get -u github.com/gin-contrib/cors
```

### 2\. 编写 `main.go`

新建 `main.go`，这是我们要实现的全部逻辑：

```go
package main

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// 定义评论模型，Gorm 会自动把它转换成数据库表
type Comment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

func main() {
	// 1. 连接 SQLite 数据库 (自动创建 comments.db)
	db, err := gorm.Open(sqlite.Open("comments.db"), &gorm.Config{})
	if err != nil {
		panic("数据库连接失败")
	}

	// 2. 自动迁移：保证数据库表结构与 Struct 同步
	db.AutoMigrate(&Comment{})

	// 3. 初始化 Gin 引擎
	r := gin.Default()

	// 4. 配置 CORS (允许跨域)
	// 因为前端可能跑在不同端口，必须允许跨域请求
	r.Use(cors.Default())

	// 5. 路由定义
	
	// 获取评论列表
	r.GET("/comments", func(c *gin.Context) {
		var comments []Comment
		// 按时间倒序查询
		db.Order("created_at desc").Find(&comments)
		c.JSON(200, comments)
	})

	// 提交新评论
	r.POST("/comments", func(c *gin.Context) {
		var jsonInput Comment
		// 绑定 JSON 数据
		if err := c.ShouldBindJSON(&jsonInput); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		// 写入数据库
		db.Create(&jsonInput)
		c.JSON(200, jsonInput)
	})

	// 6. 在 8080 端口启动服务
	r.Run(":8080")
}
```

运行后端非常简单：

```bash
go run main.go
```

看到 `Listening and serving HTTP on :8080` 即表示成功。

-----

## 第二部分：前端 —— 封装 Web Components

我们要创建一个自定义标签 `<my-comments>`，无论把它放在哪个 HTML 页面里，它都能自动渲染出评论区并拥有交互功能。

### 编写 `index.html`

为了演示方便，我们将 JS 直接写在 HTML 里（实际开发中建议分离为 `.js` 文件）。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Go + Web Components Demo</title>
</head>
<body>

    <my-comments></my-comments>

    <script>
        // 自定义组件类
        class MyComments extends HTMLElement {
            constructor() {
                super();
                // 开启 Shadow DOM，让样式与外部隔离，互不影响
                this.attachShadow({ mode: 'open' });
                this.apiUrl = 'http://localhost:8080/comments'; 
            }

            connectedCallback() {
                this.render();
                this.fetchComments(); // 组件加载时拉取数据
            }

            render() {
                this.shadowRoot.innerHTML = `
                <style>
                    :host { display: block; font-family: sans-serif; }
                    .container { 
                        max-width: 500px; margin: 20px auto; 
                        border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    }
                    h3 { margin-top: 0; color: #333; }
                    ul { list-style: none; padding: 0; max-height: 300px; overflow-y: auto; }
                    li { border-bottom: 1px solid #f0f0f0; padding: 10px 0; }
                    .content { font-size: 16px; color: #444; }
                    .time { font-size: 12px; color: #999; margin-top: 4px; }
                    .input-group { display: flex; gap: 10px; margin-top: 20px; }
                    input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
                    button { 
                        padding: 8px 16px; background: #007bff; color: white; 
                        border: none; border-radius: 4px; cursor: pointer; 
                    }
                    button:hover { background: #0056b3; }
                </style>

                <div class="container">
                    <h3>💬 评论区</h3>
                    <ul id="list">加载中...</ul>
                    <div class="input-group">
                        <input type="text" id="input" placeholder="写下你的想法..." />
                        <button id="btn">发送</button>
                    </div>
                </div>
                `;

                // 绑定点击事件
                this.shadowRoot.getElementById('btn').onclick = () => this.postComment();
            }

            // 获取评论 (GET)
            async fetchComments() {
                try {
                    const res = await fetch(this.apiUrl);
                    const data = await res.json();
                    
                    const list = this.shadowRoot.getElementById('list');
                    if (data.length === 0) {
                        list.innerHTML = '<li style="text-align:center;color:#999">暂无评论，快来抢沙发！</li>';
                        return;
                    }

                    list.innerHTML = data.map(c => `
                        <li>
                            <div class="content">${this.escapeHtml(c.content)}</div>
                            <div class="time">${new Date(c.created_at).toLocaleString()}</div>
                        </li>
                    `).join('');
                } catch (err) {
                    console.error("API Error:", err);
                    this.shadowRoot.getElementById('list').innerHTML = '加载失败，请检查后端服务。';
                }
            }

            // 提交评论 (POST)
            async postComment() {
                const input = this.shadowRoot.getElementById('input');
                const content = input.value.trim();
                if (!content) return;

                try {
                    await fetch(this.apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: content })
                    });
                    
                    input.value = ''; // 清空输入框
                    this.fetchComments(); // 刷新列表
                } catch (err) {
                    alert("发送失败！");
                }
            }

            // 简单的 XSS 防御
            escapeHtml(text) {
                return text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }
        }

        // 注册组件
        customElements.define('my-comments', MyComments);
    </script>
</body>
</html>
```

-----

## 运行效果

1. 保持 `go run main.go` 在终端运行。

   ![](/img/posts/note/back-end/go-webcomponents-comment-system/7715125d05acb0297662daca4a369095.webp)

2. 双击打开 `index.html`。

3. 输入评论并发送，你会发现评论立刻保存到了 SQLite 数据库中，刷新页面数据依然存在。

![](/img/posts/note/back-end/go-webcomponents-comment-system/9fe331792d0f75d4096b042f9eb7dd6b.webp)

## 总结

通过这个小 Demo，我们发现：

1.  **Go 做后端真的很爽**：不用配置复杂的 Webpack/Vite，不用担心数据库安装，一个二进制文件走天下。
2.  **Web Components 很强大**：它让我们回归 HTML 的本质。想象一下，你可以在你的个人博客、公司的老旧项目，甚至是别人的网站（通过油猴脚本）里，只用一行 `<my-comments></my-comments>` 就插入这个功能，是不是很酷？

希望这篇教程能给你带来灵感！Happy Coding\! ✨
