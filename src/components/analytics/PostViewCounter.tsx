import { countPostView } from '@lib/cf/post-views';
import { useEffect, useState } from 'react';

interface Props {
  /** Worker 地址，来自 site.yaml 的 analytics.cfViewCounter.endpoint */
  endpoint: string;
  /** 文章 slug（locale 无关标识，建议用主题的 post slug） */
  slug: string;
}

/**
 * 文章阅读量：挂载后向 Cloudflare Worker 计数并展示。
 * 未配置 / 请求失败时渲染 null（静默隐藏，不影响布局）。
 */
export default function PostViewCounter({ endpoint, slug }: Props) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void countPostView(endpoint, slug).then((v) => {
      if (!cancelled && v !== null) setViews(v);
    });
    return () => {
      cancelled = true;
    };
  }, [endpoint, slug]);

  if (views === null) return null;

  return <span className="tabular-nums">{views}</span>;
}
