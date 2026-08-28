/**
 * 开屏页静态文案与配置（DIY 入口）。
 *
 * 旧项目里这些值走「默认值 -> localStorage -> 后端接口」三级回退；
 * 纯静态站点没有后台，这里收敛为单一静态来源：
 * 修改本文件即可调整开屏标题、副标题、背景图与 Dock 导航。
 */

export interface HomeDockItem {
  name: string;
  href: string;
  icon: string;
}

export const copy = {
  brand: {
    logoAlt: 'NanaMiku Blog logo',
    text: 'NanaMiku Blog',
  },
  seo: {
    siteUrl: 'https://koharu.cosine.ren',
    siteTitle: 'nanamiku blog',
  },
  home: {
    metaTitle: 'nanamiku blog',
    metaDescription: 'nanamiku blog 开屏页',
    heroTitle: '创作入口',
    heroSubtitle: '把写作、作品与公开资料收拢到同一站点。',
    heroImages: ['/picture/fengmian/封面.avif', '/picture/fengmian/bloglist.jpg'],
    // Dock 主导航。纯静态站没有说说/留言/登录/后台，
    // 这里映射到新博客实际存在的页面。
    dockItems: [
      { name: '关于', href: '/about', icon: 'person' },
      { name: '博客', href: '/blog', icon: 'book' },
      { name: '音乐', href: '/music', icon: 'music' },
      { name: '番剧', href: '/bangumi', icon: 'bangumi' },
      { name: '归档', href: '/archives', icon: 'archive' },
      { name: '友链', href: '/friends', icon: 'link' },
    ],
  },
  components: {
    musicPlayer: {
      prevAria: '上一首',
      nextAria: '下一首',
      pauseAria: '暂停',
      playAria: '播放',
      volumeAria: '音量',
      closeAria: '关闭',
      loopAria: '循环',
      muteAria: '静音',
      unmuteAria: '取消静音',
      noLyrics: '暂无歌词',
    },
    heroShuffleBtn: {
      label: '换图',
      titlePrefix: '切换封面',
    },
    heroParallax: {
      coverAltPrefix: '封面 ',
    },
  },
} as const;
