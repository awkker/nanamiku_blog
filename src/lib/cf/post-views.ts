/**
 * 文章阅读量计数客户端工具。
 *
 * 配合 Cloudflare Workers + KV 后端（deploy/cf-view-counter/）：
 * - 每个浏览器会话内同一文章只 +1（sessionStorage 去重），
 *   之后的展示请求走 GET 不再累加；
 * - 任何失败（Worker 未部署 / 断网 / 跨域）静默返回 null，
 *   调用方隐藏计数元素即可，不影响页面。
 */

const SESSION_VIEWED_KEY = 'nanamiku-viewed-slugs';

interface PostViewResult {
  views: number;
  throttled?: boolean;
}

function readViewedSlugs(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(SESSION_VIEWED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markViewed(slug: string) {
  try {
    const slugs = readViewedSlugs();
    slugs.add(slug);
    window.sessionStorage.setItem(SESSION_VIEWED_KEY, JSON.stringify([...slugs]));
  } catch {
    // 存储失败不影响计数展示
  }
}

export async function countPostView(endpoint: string, slug: string): Promise<number | null> {
  if (typeof window === 'undefined' || !endpoint || !slug) return null;

  try {
    const url = new URL(endpoint);
    url.pathname = '/view';
    url.searchParams.set('slug', slug);

    const alreadyViewed = readViewedSlugs().has(slug);
    const res = await fetch(url, { method: alreadyViewed ? 'GET' : 'POST' });
    if (!res.ok) return null;

    const data = (await res.json()) as PostViewResult;
    if (!alreadyViewed) markViewed(slug);
    return data.views;
  } catch {
    return null;
  }
}
