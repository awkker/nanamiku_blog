import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';

import { copy } from '../lib/copy';
import { heroImages, heroIndex, shuffleHeroImage } from '../stores/heroImage';
import LiquidGlassCard from './LiquidGlassCard';

interface DockPalette {
  from: string;
  to: string;
  shadow: string;
  stroke: string;
  glyph: string;
}

// 这里统一收口为初音绿系。想调图标颜色优先改 `from / to / shadow`。
const MIKU_DOCK_PALETTE: DockPalette = {
  from: '#83efe5',
  to: '#39c5bb',
  shadow: 'rgba(57, 197, 187, 0.34)',
  stroke: 'rgba(238, 255, 252, 0.88)',
  glyph: 'rgba(255, 255, 255, 0.97)',
};

// Dock 手感的核心旋钮（想更 macOS 可从这里调）：
// - RANGE 决定「鼠标离多远还会影响相邻图标」
// - SCALE_BOOST 决定中心图标最多能放大多少
// - LIFT 决定图标向上抬起的高度
const DOCK_EFFECT_RANGE = 168;
const DOCK_MAX_SCALE_BOOST = 0.88;
const DOCK_MAX_LIFT = 22;
const DOCK_LABEL_RANGE = 86;

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

interface DockMetrics {
  intensity: number;
  scale: number;
  lift: number;
  tilt: number;
}

const emptyMetrics: DockMetrics = { intensity: 0, scale: 1, lift: 0, tilt: 0 };

/**
 * 底部 macOS 风格玻璃 Dock：指针放大/上抬动画、tooltip、换图按钮、液态玻璃滤镜。
 */
export default function HomeBottomDock() {
  const $heroIndex = useStore(heroIndex);
  const $heroImages = useStore(heroImages);
  const homeCopy = copy.home;
  const shuffleCopy = copy.components.heroShuffleBtn;

  const dockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [itemCenters, setItemCenters] = useState<number[]>([]);
  const [pointerX, setPointerX] = useState<number | null>(null);
  const [canTrackPointer, setCanTrackPointer] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [shuffleSpinning, setShuffleSpinning] = useState(false);
  const shuffleTimer = useRef<number | null>(null);

  const currentPath = useRef('/');

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

  // 当前激活项：优先键盘聚焦，其次指针最近距离。
  let activeIndex = -1;
  if (focusedId) {
    activeIndex = dockEntries.findIndex((entry) => entry.id === focusedId);
  } else if (canTrackPointer && pointerX !== null && itemCenters.length > 0) {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    itemCenters.forEach((center, index) => {
      const distance = Math.abs(pointerX - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    activeIndex = nearestDistance <= DOCK_LABEL_RANGE ? nearestIndex : -1;
  }

  const metricsFor = (index: number): DockMetrics => {
    const center = itemCenters[index];
    if (!canTrackPointer || pointerX === null || typeof center !== 'number') {
      return emptyMetrics;
    }

    const offset = pointerX - center;
    const distance = Math.abs(offset);
    const normalized = Math.max(0, 1 - distance / DOCK_EFFECT_RANGE);

    // 用 smoothstep 让曲线更顺，图标靠近/离开时不会显得「硬」。
    const intensity = normalized * normalized * (3 - 2 * normalized);

    return {
      intensity,
      scale: 1 + intensity * DOCK_MAX_SCALE_BOOST,
      lift: intensity * DOCK_MAX_LIFT,
      tilt: (-offset / DOCK_EFFECT_RANGE) * 6 * intensity,
    };
  };

  const iconStyleFor = (index: number): React.CSSProperties => {
    const metrics = metricsFor(index);
    const shadowSpread = 22 + metrics.intensity * 18;
    const shadowLift = 12 + metrics.intensity * 18;

    // 真正决定「macOS 味道」的是这里：
    // - transform 负责放大、上抬、轻微倾斜
    // - boxShadow 负责把中心图标做得更像从底座里弹出来
    return {
      transform: `translate3d(0, ${(-metrics.lift).toFixed(1)}px, 0) scale(${metrics.scale.toFixed(3)}) rotate(${metrics.tilt.toFixed(2)}deg)`,
      background: `linear-gradient(180deg, ${MIKU_DOCK_PALETTE.from} 0%, ${MIKU_DOCK_PALETTE.to} 100%)`,
      borderColor: MIKU_DOCK_PALETTE.stroke,
      color: MIKU_DOCK_PALETTE.glyph,
      boxShadow: `0 ${shadowLift.toFixed(1)}px ${shadowSpread.toFixed(1)}px ${MIKU_DOCK_PALETTE.shadow}, inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -10px 18px rgba(15,23,42,0.16)`,
    };
  };

  const reflectionStyleFor = (index: number): React.CSSProperties => {
    const metrics = metricsFor(index);
    return {
      opacity: (0.18 + metrics.intensity * 0.28).toFixed(3),
      transform: `translateX(-50%) scale(${(0.85 + metrics.intensity * 0.36).toFixed(3)})`,
    };
  };

  const indicatorStyleFor = (index: number, href?: string): React.CSSProperties => {
    const metrics = metricsFor(index);
    const isCurrent = Boolean(href && href === currentPath.current);
    const isActive = activeIndex === index || isCurrent;
    return {
      opacity: (isActive ? 0.96 : metrics.intensity * 0.35).toFixed(3),
      transform: `scale(${(isActive ? 1 : 0.76 + metrics.intensity * 0.38).toFixed(3)})`,
      background: isCurrent ? 'rgba(57, 197, 187, 0.96)' : 'rgba(255, 255, 255, 0.92)',
      boxShadow: isActive ? '0 0 12px rgba(57, 197, 187, 0.42)' : '0 0 10px rgba(255, 255, 255, 0.22)',
    };
  };

  const itemStyleFor = (index: number): React.CSSProperties => {
    const metrics = metricsFor(index);
    return {
      zIndex: String((activeIndex === index ? 80 : 30) + Math.round(metrics.intensity * 30)),
    };
  };

  const tooltipStyleFor = (index: number): React.CSSProperties => {
    const metrics = metricsFor(index);
    return {
      marginBottom: `${(16 + metrics.lift).toFixed(1)}px`,
    };
  };

  useEffect(() => {
    currentPath.current = window.location.pathname;

    const dock = dockRef.current;
    if (!dock) return;

    const measureItemCenters = () => {
      const dockRect = dock.getBoundingClientRect();
      setItemCenters(
        itemRefs.current.map((el) => {
          if (!el) return 0;
          const rect = el.getBoundingClientRect();
          return rect.left - dockRect.left + rect.width / 2;
        }),
      );
    };

    const updatePointerCapability = () => {
      setCanTrackPointer(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
      const dockRect = dock.getBoundingClientRect();
      setPointerX(event.clientX - dockRect.left);

      // 把鼠标位置同步给液态玻璃滤镜，让玻璃折射跟随指针。
      const frame = dock.querySelector<HTMLElement>('.liquid-glass-frame');
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
      setPointerX(null);
    };

    updatePointerCapability();
    measureItemCenters();

    dock.addEventListener('pointermove', onPointerMove, { passive: true });
    dock.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', updatePointerCapability, { passive: true });
    window.addEventListener('resize', measureItemCenters, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measureItemCenters());
      resizeObserver.observe(dock);
    }

    return () => {
      dock.removeEventListener('pointermove', onPointerMove);
      dock.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', updatePointerCapability);
      window.removeEventListener('resize', measureItemCenters);
      resizeObserver?.disconnect();
    };
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
              {dockEntries.map((entry, index) => (
                <li
                  key={entry.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className="relative flex shrink-0 justify-center"
                  style={itemStyleFor(index)}
                >
                  {activeIndex === index && (
                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 w-max max-w-none -translate-x-1/2 whitespace-nowrap rounded-2xl border border-white/80 bg-white/90 px-3 py-1.5 font-medium text-[11px] text-slate-600 tracking-[0.01em] shadow-[0_14px_32px_rgba(15,23,42,0.14)] backdrop-blur-md sm:mb-3.5"
                      style={tooltipStyleFor(index)}
                    >
                      <span>{entry.label}</span>
                      <span className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-white/75 border-r border-b bg-white/88" />
                    </div>
                  )}

                  {entry.kind === 'link' && entry.href ? (
                    <a
                      href={entry.href}
                      className="group relative flex w-[2.3rem] touch-manipulation flex-col items-center justify-end gap-1 rounded-[1.15rem] px-0.5 pt-0.5 pb-0.5 outline-none transition-[filter] duration-200 focus-visible:ring-2 focus-visible:ring-miku/65 focus-visible:ring-offset-2 focus-visible:ring-offset-white/55 sm:w-[4.45rem] sm:gap-1.5"
                      title={entry.title || entry.label}
                      aria-label={entry.label}
                      aria-current={entry.href === currentPath.current ? 'page' : undefined}
                      onFocus={() => setFocusedId(entry.id)}
                      onBlur={() => setFocusedId(null)}
                    >
                      <span className="sr-only">{entry.label}</span>
                      <span
                        className="dock-icon relative flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-[0.92rem] border sm:h-[3.1rem] sm:w-[3.1rem] sm:rounded-[1.08rem]"
                        style={iconStyleFor(index)}
                      >
                        <span className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />
                        <span className="pointer-events-none absolute top-[10%] left-1/2 h-[18%] w-[72%] -translate-x-1/2 rounded-full bg-white/50 blur-[4px] sm:blur-[6px]" />
                        <DockGlyph
                          name={entry.icon}
                          className="relative z-[1] h-[1rem] w-[1rem] sm:h-[1.38rem] sm:w-[1.38rem]"
                        />
                      </span>
                      <span
                        className="pointer-events-none absolute bottom-[0.5rem] left-1/2 h-[0.34rem] w-[1.1rem] -translate-x-1/2 rounded-full bg-slate-900/12 blur-[5px] sm:bottom-[0.8rem] sm:h-[0.42rem] sm:w-[1.65rem] sm:blur-[7px]"
                        style={reflectionStyleFor(index)}
                      />
                      <span
                        className="relative z-[1] h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5"
                        style={indicatorStyleFor(index, entry.href)}
                      />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="group relative flex w-[2.3rem] touch-manipulation flex-col items-center justify-end gap-1 rounded-[1.15rem] px-0.5 pt-0.5 pb-0.5 outline-none transition-[filter] duration-200 focus-visible:ring-2 focus-visible:ring-miku/65 focus-visible:ring-offset-2 focus-visible:ring-offset-white/55 sm:w-[4.45rem] sm:gap-1.5"
                      title={entry.title || entry.label}
                      aria-label={entry.label}
                      onClick={handleShuffleClick}
                      onFocus={() => setFocusedId(entry.id)}
                      onBlur={() => setFocusedId(null)}
                    >
                      <span className="sr-only">{entry.label}</span>
                      <span
                        className="dock-icon relative flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-[0.92rem] border sm:h-[3.1rem] sm:w-[3.1rem] sm:rounded-[1.08rem]"
                        style={iconStyleFor(index)}
                      >
                        <span className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />
                        <span className="pointer-events-none absolute top-[10%] left-1/2 h-[18%] w-[72%] -translate-x-1/2 rounded-full bg-white/50 blur-[4px] sm:blur-[6px]" />
                        <DockGlyph
                          name={entry.icon}
                          className={`relative z-[1] h-[1rem] w-[1rem] transition-transform duration-500 sm:h-[1.38rem] sm:w-[1.38rem] ${shuffleSpinning ? 'rotate-180' : ''}`}
                        />
                      </span>
                      <span
                        className="pointer-events-none absolute bottom-[0.5rem] left-1/2 h-[0.34rem] w-[1.1rem] -translate-x-1/2 rounded-full bg-slate-900/12 blur-[5px] sm:bottom-[0.8rem] sm:h-[0.42rem] sm:w-[1.65rem] sm:blur-[7px]"
                        style={reflectionStyleFor(index)}
                      />
                      <span
                        className="relative z-[1] h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5"
                        style={indicatorStyleFor(index)}
                      />
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
