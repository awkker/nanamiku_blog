# 文章阅读量 Worker（Cloudflare Workers + KV）

给纯静态博客提供「每篇文章阅读量」的无服务器计数后端。

## 部署步骤（一次性）

1. 创建 KV 命名空间并记下 id：

   ```bash
   npx wrangler kv namespace create VIEWS
   ```

2. 把返回的 `id` 填入 `wrangler.jsonc` 的 `kv_namespaces[0].id`。

3. 部署 Worker：

   ```bash
   npx wrangler deploy
   ```

   记下输出的 URL，例如 `https://nanamiku-post-views.<你的子域>.workers.dev`。

4. 回站点根目录，编辑 `config/site.yaml`：

   ```yaml
   analytics:
     cfViewCounter:
       enabled: true
       endpoint: https://nanamiku-post-views.<你的子域>.workers.dev
   ```

5. 重新构建站点（`pnpm build`）。文章卡片与文章详情页会自动显示阅读量；
   未配置（`enabled: false`）时前端完全不加载相关代码。

## 接口

| 方法 | 路径 | 行为 |
|------|------|------|
| GET  | `/view?slug=<slug>` | 返回当前计数 `{ "views": 123 }` |
| POST | `/view?slug=<slug>` | 计数 +1 并返回；同 IP 同文章 60 秒内去重（`throttled: true`） |

## 说明

- 前端去重：同一浏览器会话内同一文章只 POST 一次（`sessionStorage`）。
- 失败降级：Worker 不可用时前端静默隐藏阅读量，不影响页面。
- KV 是最终一致存储，计数在极端并发下允许微小误差（个人博客足够）。
- 想要全站访问统计，另见 `docs/deploy/cloudflare.md` 里的 Cloudflare Web Analytics。
