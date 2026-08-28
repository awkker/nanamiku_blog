import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';

import { copy } from '../lib/copy';
import { heroImages, heroIndex, shuffleHeroImage } from '../stores/heroImage';
import LiquidGlassCard from './LiquidGlassCard';

// Dock 手感旋钮（想更 macOS 可从这里调）：
// - RANGE 决定「鼠标离多远还会影响相邻图标」
// - SCALE_BOOST 决定中心图标最多放大多少（macOS 以放大为主，几乎不上浮）
// - LIFT 决定图标向上抬起的高度（保持很小，避免「蹦起来」）
// - LERP 是每帧逼近目标的惯性系数，越大跟手越快、越小越柔和
const DOCK_EFFECT_RANGE = 168;
const DOCK_MAX_SCALE_BOOST = 0.8;
const DOCK_MAX_LIFT = 8;
const DOCK_MAX_TILT = 1.5;
const DOCK_LABEL_RANGE = 86;
const DOCK_LERP = 0.3;

// 相邻图标间距随放大强度动态展开的幅度（macOS 里放大的图标会把邻居「挤开」）
const DOCK_GAP_SPREAD = 10;

// 底板随图标放大而纵向膨胀的幅度（横向由布局间距自然展开，不再额外缩放）
const DOCK_FRAME_SCALE_X = 0;
const DOCK_FRAME_SCALE_Y = 0.05;

// 弹出阴影色：CSS 变量（白天初音绿 / 夜间薰衣草紫，定义在开屏样式）
const MIKU_SHADOW = 'var(--dock-shadow, rgba(57, 197, 187, 0.34))';

interface DockIconData {
  viewBox: string;
  d: string;
}

// Dock 图标与主题对齐：与 config/site.yaml 导航菜单同款图标
// （Remix Icon / Font Awesome 6），SVG 数据来自
// @iconify-json/ri 与 @iconify-json/fa6-regular，内联渲染以便纯静态离线使用。
const ICON_ICONS: Record<string, DockIconData> = {
  person: {
    viewBox: '0 0 512 512', // fa6-regular:circle-user（nav.about）
    d: 'M406.5 399.6c-19.1-46.7-65-79.6-118.5-79.6h-64c-53.5 0-99.4 32.9-118.5 79.6C69.9 362.2 48 311.7 48 256c0-114.9 93.1-208 208-208s208 93.1 208 208c0 55.7-21.9 106.2-57.5 143.6m-40.1 32.7c-32 20.1-69.8 31.7-110.4 31.7s-78.4-11.6-110.5-31.7c7.3-36.7 39.7-64.3 78.5-64.3h64c38.8 0 71.2 27.6 78.5 64.3zM256 512a256 256 0 1 0 0-512a256 256 0 1 0 0 512m0-272a40 40 0 1 1 0-80a40 40 0 1 1 0 80m-88-40a88 88 0 1 0 176 0a88 88 0 1 0-176 0',
  },
  book: {
    viewBox: '0 0 24 24', // ri:home-heart-fill（nav.home）
    d: 'M20 20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9H1l10.327-9.388a1 1 0 0 1 1.346 0L23 11h-3zm-8-3l3.359-3.359a2.25 2.25 0 0 0-3.182-3.182l-.177.177l-.177-.177a2.25 2.25 0 0 0-3.182 3.182z',
  },
  music: {
    viewBox: '0 0 24 24', // ri:music-2-fill（nav.music）
    d: 'M20 3v14a4 4 0 1 1-2-3.465V6H9v11a4 4 0 1 1-2-3.465V3z',
  },
  bangumi: {
    viewBox: '0 0 24 24', // ri:bilibili-fill（bangumi 默认导航图标）
    d: 'M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 0 1 1.767-1.768l2.652 2.652q.119.119.198.257h3.213q.08-.14.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0m.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.198 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25m-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25m7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25',
  },
  archive: {
    viewBox: '0 0 24 24', // ri:archive-2-fill（nav.archives）
    d: 'M22 20V7l-2-4H4L2 7.004V20a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1M5.236 5h13.528l1 2H4.237zM9 11h6v2H9z',
  },
  link: {
    viewBox: '0 0 24 24', // ri:links-line（nav.friends）
    d: 'm13.06 8.111l1.415 1.414a7 7 0 0 1 0 9.9l-.354.353a7 7 0 1 1-9.9-9.9l1.415 1.415a5 5 0 1 0 7.071 7.071l.354-.354a5 5 0 0 0 0-7.07l-1.415-1.415zm6.718 6.01l-1.414-1.414a5 5 0 0 0-7.071-7.07l-.354.353a5 5 0 0 0 0 7.07l1.415 1.415l-1.415 1.414l-1.414-1.414a7 7 0 0 1 0-9.9l.354-.353a7 7 0 1 1 9.9 9.9',
  },
  shuffle: {
    viewBox: '0 0 24 24', // ri:shuffle-line
    d: 'M18 17.883V16l5 3l-5 3v-2.09a9 9 0 0 1-6.997-5.365L11 14.54l-.003.006A9 9 0 0 1 2.725 20H2v-2h.725a7 7 0 0 0 6.434-4.243L9.912 12l-.753-1.757A7 7 0 0 0 2.725 6H2V4h.725a9 9 0 0 1 8.272 5.455L11 9.46l.003-.006A9 9 0 0 1 18 4.09V2l5 3l-5 3V6.117a7 7 0 0 0-5.159 4.126L12.088 12l.753 1.757A7 7 0 0 0 18 17.883',
  },
};

interface DockEntry {
  id: string;
  label: string;
  icon: string;
  kind: 'link' | 'action';
  href?: string;
  title?: string;
}

/**
 * Dock 图标：按名称查表内联渲染 SVG（数据即主题同款图标）。
 */
function DockGlyph({ name, className = '' }: { name: string; className?: string }) {
  const icon = ICON_ICONS[name] || ICON_ICONS.shuffle;
  return (
    <svg aria-hidden="true" viewBox={icon.viewBox} className={className}>
      <path d={icon.d} fill="currentColor" />
    </svg>
  );
}

/** 每个 Dock 项中需要按帧驱动的元素引用。 */
interface DockItemRefs {
  li: HTMLElement;
  icon: HTMLElement;
  reflection: HTMLElement;
  indicator: HTMLElement;
  tooltip: HTMLElement | null;
  href?: string;
}

/**
 * 底部 macOS 风格玻璃 Dock。
 *
 * 动效实现说明：
 * - 不经过 React state 渲染，指针事件只更新「目标强度」，
 *   由 rAF 循环做惯性插值（lerp）后直接写入 DOM —— 平滑且跟手；
 * - macOS 手感：以放大为主、轻微上浮、无倾斜；图标放大时
 *   玻璃底板会同步横向/纵向轻微膨胀。
 */
export default function HomeBottomDock() {
  const $heroIndex = useStore(heroIndex);
  const $heroImages = useStore(heroImages);
  const homeCopy = copy.home;
  const shuffleCopy = copy.components.heroShuffleBtn;

  const dockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<DockItemRefs[]>([]);
  const centersRef = useRef<number[]>([]);
  const pointerXRef = useRef<number | null>(null);
  const targetRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const focusedIdRef = useRef<string | null>(null);
  const currentPathRef = useRef('/');
  const [shuffleSpinning, setShuffleSpinning] = useState(false);
  const shuffleTimer = useRef<number | null>(null);

  const shuffleTitle = () => {
    const total = Math.max($heroImages.length, 1);
    const current = Math.min($heroIndex + 1, total);
    return `${shuffleCopy.titlePrefix} (${current}/${total})`;
  };

  // Dock 项来自静态 copy 配置，末尾固定追加「换图」动作按钮。
  const dockEntries: DockEntry[] = [
    ...homeCopy.dockItems.map((item) => ({
      id: `dock:${item.href}`,
      label: item.name,
      icon: item.icon,
      kind: 'link' as const,
      href: item.href,
    })),
    {
      id: 'dock:shuffle',
      label: shuffleCopy.label,
      icon: 'shuffle',
      kind: 'action',
      title: shuffleTitle(),
    },
  ];

  // biome-ignore lint/correctness/useExhaustiveDependencies: dockEntries 为静态配置，effect 只初始化一次
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    currentPathRef.current = window.location.pathname;

    // ---- 收集每项的可驱动元素 ----
    const lis = Array.from(dock.querySelectorAll<HTMLElement>('li[data-dock-item]'));
    itemRefs.current = lis.map((li) => ({
      li,
      icon: li.querySelector<HTMLElement>('.dock-icon') as HTMLElement,
      reflection: li.querySelector<HTMLElement>('[data-dock-reflection]') as HTMLElement,
      indicator: li.querySelector<HTMLElement>('[data-dock-indicator]') as HTMLElement,
      tooltip: li.querySelector<HTMLElement>('[data-dock-tooltip]'),
      href: li.getAttribute('data-dock-href') ?? undefined,
    }));
    targetRef.current = lis.map(() => 0);
    currentRef.current = lis.map(() => 0);

    const frame = dock.querySelector<HTMLElement>('.liquid-glass-frame');

    const canTrackPointer = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

    const measureCenters = () => {
      const dockRect = dock.getBoundingClientRect();
      centersRef.current = itemRefs.current.map((item) => {
        const rect = item.li.getBoundingClientRect();
        return rect.left - dockRect.left + rect.width / 2;
      });
    };

    // ---- 指针事件只更新「目标强度」 ----
    const onPointerMove = (event: PointerEvent) => {
      if (!canTrackPointer()) return;
      const dockRect = dock.getBoundingClientRect();
      pointerXRef.current = event.clientX - dockRect.left;

      // 把鼠标位置同步给液态玻璃滤镜，让玻璃折射跟随指针。
      if (frame) {
        frame.dispatchEvent(
          new MouseEvent('mousemove', {
            clientX: event.clientX,
            clientY: event.clientY,
          }),
        );
      }
    };

    const onPointerLeave = () => {
      pointerXRef.current = null;
    };

    // ---- rAF 循环：惯性插值 + 直接写 DOM ----
    let rafId = 0;
    const smoothStep = (t: number) => {
      const n = Math.max(0, Math.min(1, t));
      return n * n * (3 - 2 * n);
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const loop = () => {
      rafId = requestAnimationFrame(loop);

      const px = pointerXRef.current;
      const centers = centersRef.current;
      const items = itemRefs.current;
      const canTrack = canTrackPointer();

      // 计算每个图标的目标强度（平滑阶跃曲线）。
      for (let i = 0; i < items.length; i++) {
        let target = 0;
        if (canTrack && px !== null && centers.length > 0) {
          const distance = Math.abs(px - centers[i]);
          target = Math.max(0, 1 - distance / DOCK_EFFECT_RANGE);
        }
        targetRef.current[i] = target;
        // 惯性插值：当前值每帧向目标逼近，产生柔和的跟随感。
        currentRef.current[i] = lerp(currentRef.current[i], target, DOCK_LERP);
      }

      // 平滑后的强度数组（间距/视觉统一使用，避免重复计算）。
      const intensityArr = currentRef.current.map((v) => smoothStep(v));

      // 计算 tooltip 激活项（键盘聚焦优先，其次指针最近）。
      let activeIndex = -1;
      const focusedId = focusedIdRef.current;
      if (focusedId) {
        activeIndex = dockEntries.findIndex((entry) => entry.id === focusedId);
      } else if (canTrack && px !== null && centers.length > 0) {
        let nearest = -1;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let i = 0; i < centers.length; i++) {
          const distance = Math.abs(px - centers[i]);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = i;
          }
        }
        activeIndex = nearestDistance <= DOCK_LABEL_RANGE ? nearest : -1;
      }

      // 应用每项的视觉状态。
      let maxIntensity = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const intensity = intensityArr[i];
        maxIntensity = Math.max(maxIntensity, intensity);

        const scale = 1 + intensity * DOCK_MAX_SCALE_BOOST;
        const lift = intensity * DOCK_MAX_LIFT;
        const tilt = intensity * DOCK_MAX_TILT;
        const isActive = activeIndex === i;
        const isCurrent = Boolean(item.href && item.href === currentPathRef.current);

        // 图标：放大 + 轻微上浮（macOS 以放大为主）。
        item.icon.style.transform = `translate3d(0, ${(-lift).toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`;

        // 相邻间距动态展开：放大中的图标会把邻居「挤开」，
        // 间距增量取左右相邻两个图标强度的较大值；
        // 首尾项只向内展开，保证 Dock 整体不漂移。
        const leftNeighbor = i > 0 ? intensityArr[i - 1] : 0;
        const rightNeighbor = i < items.length - 1 ? intensityArr[i + 1] : 0;
        if (i === 0) {
          item.li.style.marginLeft = '0px';
        } else {
          item.li.style.marginLeft = `${(Math.max(intensity, leftNeighbor) * DOCK_GAP_SPREAD).toFixed(1)}px`;
        }
        if (i === items.length - 1) {
          item.li.style.marginRight = '0px';
        } else {
          item.li.style.marginRight = `${(Math.max(intensity, rightNeighbor) * DOCK_GAP_SPREAD).toFixed(1)}px`;
        }

        // 弹出阴影随强度增强。
        const shadowSpread = 22 + intensity * 18;
        const shadowLift = 12 + intensity * 14;
        item.icon.style.boxShadow = `0 ${shadowLift.toFixed(1)}px ${shadowSpread.toFixed(1)}px ${MIKU_SHADOW}, inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -10px 18px rgba(15,23,42,0.16)`;

        // 底部倒影。
        item.reflection.style.opacity = (0.18 + intensity * 0.28).toFixed(3);
        item.reflection.style.transform = `translateX(-50%) scale(${(0.85 + intensity * 0.36).toFixed(3)})`;

        // 指示点。
        const indicatorOpacity = isActive ? 0.96 : intensity * 0.35;
        const indicatorScale = isActive ? 1 : 0.76 + intensity * 0.38;
        item.indicator.style.opacity = indicatorOpacity.toFixed(3);
        item.indicator.style.transform = `scale(${indicatorScale.toFixed(3)})`;
        item.indicator.style.background = isCurrent
          ? 'var(--dock-indicator, rgba(57, 197, 187, 0.96))'
          : 'rgba(255, 255, 255, 0.92)';
        item.indicator.style.boxShadow = isActive ? '0 0 12px rgba(57, 197, 187, 0.42)' : '0 0 10px rgba(255, 255, 255, 0.22)';

        // 层级与 tooltip。
        item.li.style.zIndex = String((isActive ? 80 : 30) + Math.round(intensity * 30));
        if (item.tooltip) {
          item.tooltip.style.opacity = isActive ? '1' : '0';
          item.tooltip.style.marginBottom = `${(16 + lift).toFixed(1)}px`;
        }
      }

      // 玻璃底板随最大强度膨胀（macOS 的底板跟着图标一起变宽变高）。
      if (frame) {
        const sx = 1 + maxIntensity * DOCK_FRAME_SCALE_X;
        const sy = 1 + maxIntensity * DOCK_FRAME_SCALE_Y;
        frame.style.transform = `translateZ(0) scaleX(${sx.toFixed(4)}) scaleY(${sy.toFixed(4)})`;
      }
    };

    measureCenters();
    dock.addEventListener('pointermove', onPointerMove, { passive: true });
    dock.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', measureCenters, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measureCenters());
      resizeObserver.observe(dock);
    }

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      dock.removeEventListener('pointermove', onPointerMove);
      dock.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', measureCenters);
      resizeObserver?.disconnect();
    };
    // dockEntries 为静态配置，effect 只初始化一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShuffleClick = () => {
    setShuffleSpinning(true);
    shuffleHeroImage();
    if (shuffleTimer.current) window.clearTimeout(shuffleTimer.current);
    shuffleTimer.current = window.setTimeout(() => {
      setShuffleSpinning(false);
      shuffleTimer.current = null;
    }, 520);
  };

  return (
    <div className="absolute bottom-2 left-1/2 z-20 w-[calc(100vw-0.35rem)] max-w-[900px] -translate-x-1/2 px-0.5 sm:bottom-2.5 sm:px-0">
      <div ref={dockRef} className="relative mx-auto flex w-fit max-w-full justify-center overflow-visible">
        <div className="relative grid w-fit max-w-full overflow-visible">
          <LiquidGlassCard
            width="100%"
            maxWidth="100%"
            padding="0"
            borderRadius={28}
            className="dock-shell pointer-events-none col-start-1 row-start-1 h-full min-h-[3.95rem] self-stretch sm:min-h-[5.3rem]"
          >
            <div aria-hidden="true" className="h-full w-full" />
          </LiquidGlassCard>

          <div className="relative z-[1] col-start-1 row-start-1 flex w-fit max-w-full overflow-visible px-[8px] pt-[8px] pb-[7px]">
            <ul className="relative flex items-end justify-center gap-0.5 pt-0.5 sm:gap-1.5 sm:pt-1">
              {dockEntries.map((entry) => (
                <li key={entry.id} data-dock-item data-dock-href={entry.href} className="relative flex shrink-0 justify-center">
                  <div
                    data-dock-tooltip
                    className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 w-max max-w-none -translate-x-1/2 whitespace-nowrap rounded-2xl border border-white/80 bg-white/90 px-3 py-1.5 font-medium text-[11px] text-slate-600 tracking-[0.01em] opacity-0 shadow-[0_14px_32px_rgba(15,23,42,0.14)] backdrop-blur-md transition-opacity duration-150 sm:mb-3.5"
                  >
                    <span>{entry.label}</span>
                    <span className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-white/75 border-r border-b bg-white/88" />
                  </div>

                  {entry.kind === 'link' && entry.href ? (
                    <a
                      href={entry.href}
                      className="group relative flex w-[2.3rem] touch-manipulation flex-col items-center justify-end gap-1 rounded-[1.15rem] px-0.5 pt-0.5 pb-0.5 outline-none transition-[filter] duration-200 focus-visible:ring-2 focus-visible:ring-miku/65 focus-visible:ring-offset-2 focus-visible:ring-offset-white/55 sm:w-[4.45rem] sm:gap-1.5"
                      title={entry.title || entry.label}
                      aria-label={entry.label}
                      aria-current={entry.href === currentPathRef.current ? 'page' : undefined}
                      onFocus={() => {
                        focusedIdRef.current = entry.id;
                      }}
                      onBlur={() => {
                        focusedIdRef.current = null;
                      }}
                    >
                      <span className="sr-only">{entry.label}</span>
                      <span className="dock-icon relative flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-[0.92rem] border sm:h-[3.1rem] sm:w-[3.1rem] sm:rounded-[1.08rem]">
                        <span className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />
                        <span className="pointer-events-none absolute top-[10%] left-1/2 h-[18%] w-[72%] -translate-x-1/2 rounded-full bg-white/50 blur-[4px] sm:blur-[6px]" />
                        <DockGlyph
                          name={entry.icon}
                          className="relative z-[1] h-[1rem] w-[1rem] sm:h-[1.38rem] sm:w-[1.38rem]"
                        />
                      </span>
                      <span
                        data-dock-reflection
                        className="pointer-events-none absolute bottom-[0.5rem] left-1/2 h-[0.34rem] w-[1.1rem] -translate-x-1/2 rounded-full bg-slate-900/12 blur-[5px] sm:bottom-[0.8rem] sm:h-[0.42rem] sm:w-[1.65rem] sm:blur-[7px]"
                      />
                      <span data-dock-indicator className="relative z-[1] h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="group relative flex w-[2.3rem] touch-manipulation flex-col items-center justify-end gap-1 rounded-[1.15rem] px-0.5 pt-0.5 pb-0.5 outline-none transition-[filter] duration-200 focus-visible:ring-2 focus-visible:ring-miku/65 focus-visible:ring-offset-2 focus-visible:ring-offset-white/55 sm:w-[4.45rem] sm:gap-1.5"
                      title={entry.title || entry.label}
                      aria-label={entry.label}
                      onClick={handleShuffleClick}
                      onFocus={() => {
                        focusedIdRef.current = entry.id;
                      }}
                      onBlur={() => {
                        focusedIdRef.current = null;
                      }}
                    >
                      <span className="sr-only">{entry.label}</span>
                      <span className="dock-icon relative flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-[0.92rem] border sm:h-[3.1rem] sm:w-[3.1rem] sm:rounded-[1.08rem]">
                        <span className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />
                        <span className="pointer-events-none absolute top-[10%] left-1/2 h-[18%] w-[72%] -translate-x-1/2 rounded-full bg-white/50 blur-[4px] sm:blur-[6px]" />
                        <DockGlyph
                          name={entry.icon}
                          className={`relative z-[1] h-[1rem] w-[1rem] transition-transform duration-500 sm:h-[1.38rem] sm:w-[1.38rem] ${shuffleSpinning ? 'rotate-180' : ''}`}
                        />
                      </span>
                      <span
                        data-dock-reflection
                        className="pointer-events-none absolute bottom-[0.5rem] left-1/2 h-[0.34rem] w-[1.1rem] -translate-x-1/2 rounded-full bg-slate-900/12 blur-[5px] sm:bottom-[0.8rem] sm:h-[0.42rem] sm:w-[1.65rem] sm:blur-[7px]"
                      />
                      <span data-dock-indicator className="relative z-[1] h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
