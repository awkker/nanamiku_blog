/**
 * 文章阅读量计数器（Cloudflare Workers + KV）
 *
 * 部署步骤见本目录 README.md。
 * 接口约定：
 *   GET  /view?slug=<slug>  → { "views": 123 }
 *   POST /view?slug=<slug>  → { "views": 124 }  （同 IP 同文章 60 秒内去重，返回 throttled: true）
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    const url = new URL(request.url);
    if (url.pathname !== '/view') {
      return new Response('Not Found', { status: 404, headers: cors });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const slug = (url.searchParams.get('slug') || '').trim().slice(0, 200);
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug required' }), { status: 400, headers: cors });
    }

    const key = `views:${slug}`;
    const method = request.method.toUpperCase();

    if (method === 'GET') {
      const views = Number((await env.VIEWS.get(key)) ?? 0);
      return new Response(JSON.stringify({ views }), { headers: cors });
    }

    if (method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const rateKey = `rate:${slug}:${ip}`;
      const last = await env.VIEWS.get(rateKey);
      const now = Date.now();
      const views = Number((await env.VIEWS.get(key)) ?? 0);

      // 同 IP 同文章 60 秒内重复请求不重复计数
      if (last && now - Number(last) < 60_000) {
        return new Response(JSON.stringify({ views, throttled: true }), { headers: cors });
      }

      await env.VIEWS.put(rateKey, String(now), { expirationTtl: 60 });
      const next = views + 1;
      await env.VIEWS.put(key, String(next));
      return new Response(JSON.stringify({ views: next }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: cors });
  },
};
