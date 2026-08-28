# 部署到 Cloudflare

本站是纯静态输出（Astro `output: 'static'`），可以直接部署到 **Cloudflare Pages**；
文章阅读量等动态能力由 **Cloudflare Workers + KV** 提供，二者可以独立部署。

## 1. Cloudflare Pages（主站）

### 方式 A：Git 集成（推荐）

1. 将仓库推送到 GitHub / GitLab。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git。
3. 构建配置：

   | 项 | 值 |
   |----|----|
   | Framework preset | **Astro** |
   | Build command | `pnpm build` |
   | Build output directory | `dist` |
   | Node version | `22.x`（见 `package.json` engines） |

4. 部署前先改 `config/site.yaml` 的 `site.url` 为最终域名（影响 RSS、sitemap、SEO）。

### 方式 B：Wrangler 直推

```bash
pnpm build
npx wrangler pages deploy dist --project-name nanamiku-blog
```

> 注意：Pages 免费计划每次构建 ~500 次/月，足够个人博客使用。
> 构建产物约包含全部静态页面与 Pagefind 索引，无需任何服务端运行时。

## 2. 可选插件

### Cloudflare Web Analytics（官方统计）

1. Dashboard → Analytics & Logs → Web Analytics → Add a site → 获取 token。
2. 在 `config/site.yaml` 中启用：

   ```yaml
   analytics:
     cloudflare:
       enabled: true
       token: <你的 token>
   ```

3. 重新构建部署。所有页面自动注入官方 Beacon 脚本（无 Cookie、不拖慢首屏）。

### 文章阅读量（Workers + KV）

完整步骤见 [`deploy/cf-view-counter/README.md`](../deploy/cf-view-counter/README.md)，概括：

1. 创建 KV 命名空间并部署 `deploy/cf-view-counter/` 下的 Worker。
2. 在 `config/site.yaml` 中启用并填入 Worker 地址：

   ```yaml
   analytics:
     cfViewCounter:
       enabled: true
       endpoint: https://nanamiku-post-views.<你的子域>.workers.dev
   ```

3. 重新构建。文章详情页与文章卡片会自动显示阅读量；
   Worker 不可用时前端静默隐藏，不影响任何功能。

## 3. 常见问题

- **免费额度**：Pages 与 Workers 免费计划对个人博客足够；KV 免费额度 10 万读/天、1000 写/天。
- **自定义域名**：Pages 项目 → Custom domains 绑定你的域名即可；Worker 也可以绑定 routes 或 custom domain。
- **R2 / 图片**：站点图片目前走 `public/` 静态托管；想迁移到 R2 只需替换 `config/site.yaml` 中的图片路径即可。
- **预览环境**：Pages 的 preview 部署会自动注入预览域名，`site.url` 以生产为准即可。
