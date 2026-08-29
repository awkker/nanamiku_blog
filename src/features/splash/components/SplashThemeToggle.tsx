import { useEffect, useState } from 'react';

/**
 * 开屏专用主题切换小按钮（与博客共用 localStorage.theme + html.dark）。
 * 视觉按开屏顶栏设计：白色玻璃小圆钮 + 初音绿图标。
 * 切换时使用与博客一致的 View Transition「渐变扫过」动画。
 */

/** 用渐变扫过动画应用主题（与博客 ThemeToggle 一致）。 */
function applyThemeWithTransition(dark: boolean) {
  const root = document.documentElement;
  root.classList.add('theme-transition');

  const apply = () => {
    root.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };

  if (typeof document !== 'undefined' && document.startViewTransition) {
    const transition = document.startViewTransition(apply);
    transition.finished.finally(() => {
      root.classList.remove('theme-transition');
    });
  } else {
    apply();
    setTimeout(() => root.classList.remove('theme-transition'), 100);
  }
}

export default function SplashThemeToggle() {
  // SSR 与客户端首渲染统一为 false，挂载后再同步真实主题，
  // 避免水合不一致（React error #418）。
  const [isDark, setIsDark] = useState(false);

  // 挂载后同步真实主题状态。
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // 与其他标签页/博客页面同步（博客切换主题后，开屏跟随）。
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'theme') return;
      const dark = e.newValue === 'dark';
      applyThemeWithTransition(dark);
      setIsDark(dark);
    };
    window.addEventListener('storage', onStorage);

    // 跟随系统自动切换（晚上系统转深色 → 站点跟着转），未手动设置主题时生效。
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if ('theme' in localStorage) return;
      const dark = mql.matches;
      applyThemeWithTransition(dark);
      setIsDark(dark);
    };
    mql.addEventListener('change', onSystemChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      mql.removeEventListener('change', onSystemChange);
    };
  }, []);

  const toggle = () => {
    const next = !isDark;
    applyThemeWithTransition(next);
    setIsDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="splash-theme-btn"
      aria-label={isDark ? '切换到白天模式' : '切换到夜间模式'}
      title={isDark ? '切换到白天模式' : '切换到夜间模式'}
    >
      {isDark ? (
        /* 太阳：点击进入白天模式 */
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-[1.8] stroke-current">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        /* 月亮：点击进入夜间模式 */
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-[1.8] stroke-current">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
