import type { BgmAudioGroup } from '@lib/config/types';
import { createLiquidGlass, type LiquidGlassController } from '@lib/liquidGlass';
import { type MetingSong, resolvePlaylist } from '@lib/meting';
import { useEffect, useRef, useState } from 'react';

// 播放器无障碍文案（独立于开屏 copy，供两处共用）。
const mp = {
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
};

// 跨页面续播状态（开屏与博客顶栏两个播放器实例共享）。
const RESUME_KEY = 'nanamiku-player-state';

interface ResumeState {
  index: number;
  time: number;
  playing: boolean;
}

function readResumeState(): ResumeState | null {
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResumeState>;
    if (typeof parsed.index !== 'number') return null;
    return {
      index: parsed.index,
      time: typeof parsed.time === 'number' ? parsed.time : 0,
      playing: parsed.playing === true,
    };
  } catch {
    return null;
  }
}

function writeResumeState(patch: Partial<ResumeState>) {
  try {
    const current = readResumeState() ?? { index: 0, time: 0, playing: false };
    window.localStorage.setItem(RESUME_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // 存储失败不影响播放
  }
}

interface LyricLine {
  time: number;
  text: string;
}

function parseLRC(text: string): LyricLine[] {
  // LRC 的每一行通常形如：
  // [01:23.45] 这一句歌词
  // 这里把它解析成「时间 + 文本」的结构，方便后面按时间高亮。
  const result: LyricLine[] = [];
  for (const raw of text.split('\n')) {
    const m = raw.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (!m) continue;
    const time = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + parseInt(m[3].padEnd(3, '0'), 10) / 1000;
    const t = m[4].trim();
    if (t) result.push({ time, text: t });
  }
  return result.sort((a, b) => a.time - b.time);
}

function formatTime(s: number): string {
  if (!s || Number.isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`;
}

interface Props {
  /** 与博客 bgm 同源的歌单配置（config/site.yaml → bgm.audio） */
  audioGroups: BgmAudioGroup[];
  /** Meting API 地址（config/site.yaml → bgm.metingApi，可选） */
  metingApi?: string;
  /**
   * 顶栏背景上下文：
   * - over-dark：开屏（背景始终是深色封面），按钮用白色玻璃系
   * - adaptive：博客顶栏（亮色玻璃条 / 暗色玻璃条自适应）
   */
  variant?: 'over-dark' | 'adaptive';
  /** 紧凑模式（博客顶栏）：只保留曲名与播放/暂停按钮 */
  compact?: boolean;
}

type LoadState = 'loading' | 'ready' | 'error';

/**
 * 迷你音乐播放器（开屏顶栏 + 博客顶栏共用）。
 *
 * 数据源与博客全局 BGM 统一：通过 Meting API 解析 config/site.yaml
 * 里配置的网易云歌单（`resolvePlaylist`），本地 mp3 不再使用。
 * 歌单解析失败时按钮降级为「加载失败」并禁用。
 */
export default function MusicPlayer({ audioGroups, metingApi, variant = 'over-dark', compact = false }: Props) {
  const [tracks, setTracks] = useState<MetingSong[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.45);
  const [loopMode, setLoopMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<LiquidGlassController | null>(null);
  const loopModeRef = useRef(false);
  const currentIndexRef = useRef(0);
  const tracksRef = useRef<MetingSong[]>([]);
  const pendingResumeRef = useRef<{ time: number; autoplay: boolean } | null>(null);
  const lastTimeWriteRef = useRef(0);

  const track = tracks[currentIndex] ?? null;

  // 解析网易云歌单（与博客 bgm 同一数据源）。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 歌单配置为静态 props，仅在 metingApi 变化时重新解析
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const results = await Promise.all(audioGroups.map((group) => resolvePlaylist(group.list, metingApi)));
        const all = results.flat();
        if (cancelled) return;
        tracksRef.current = all;
        setTracks(all);
        setLoadState(all.length > 0 ? 'ready' : 'error');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metingApi]);

  // 只维护一个 Audio 实例，切歌时替换 src。
  // biome-ignore lint/correctness/useExhaustiveDependencies: Audio 实例只创建一次，loadTrack 经 ref/闭包访问
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = 0.45;

    // 跨页面续播：恢复「曲目 + 进度」，仅在离开时正在播放才尝试继续播放
    // （手动暂停离开 → playing=false → 新页面绝不自动播放）。
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      const pending = pendingResumeRef.current;
      if (pending) {
        pendingResumeRef.current = null;
        if (pending.time > 0 && pending.time < audio.duration) {
          audio.currentTime = pending.time;
        }
        if (pending.autoplay) {
          // 跨整页导航后可能被浏览器自动播放策略拦截，失败则停在进度上。
          audio.play().catch(() => {});
        }
      }
    });
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      // 节流持久化进度，避免频繁写 localStorage。
      const now = Date.now();
      if (now - lastTimeWriteRef.current > 5000) {
        lastTimeWriteRef.current = now;
        writeResumeState({ time: audio.currentTime });
      }
    });
    audio.addEventListener('ended', () => {
      // 单曲循环时回到 0 秒继续播；否则进入下一首。
      if (loopModeRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        const nextIndex = (currentIndexRef.current + 1) % Math.max(tracksRef.current.length, 1);
        loadTrack(nextIndex, audio, true);
      }
    });
    audio.addEventListener('play', () => {
      setIsPlaying(true);
      writeResumeState({ playing: true, index: currentIndexRef.current });
    });
    audio.addEventListener('pause', () => {
      setIsPlaying(false);
      // 记录暂停意图：切换页面后不得自动播放。
      writeResumeState({ playing: false, time: audio.currentTime, index: currentIndexRef.current });
    });
    audioRef.current = audio;

    // 页面离开时保存最终进度与播放状态（暂停则记为暂停）。
    const onPageHide = () => {
      writeResumeState({ time: audio.currentTime, playing: !audio.paused, index: currentIndexRef.current });
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      // 组件销毁时停掉音频并清空资源地址，避免残留播放。
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 歌单就绪后载入曲目：优先恢复上次播放位置，否则第一首（不自动播放）。
  useEffect(() => {
    if (loadState !== 'ready' || tracks.length === 0) return;
    const audio = audioRef.current;
    if (!audio) return;

    const resume = readResumeState();
    if (resume && tracks[resume.index]) {
      // 恢复上次的曲目与进度；仅当离开时正在播放才尝试续播。
      currentIndexRef.current = resume.index;
      setCurrentIndex(resume.index);
      setLyrics(parseLRC(tracks[resume.index]?.lrc ?? ''));
      audio.src = tracks[resume.index]?.url ?? '';
      pendingResumeRef.current = { time: resume.time, autoplay: resume.playing };
      audio.load();
      return;
    }

    currentIndexRef.current = 0;
    setCurrentIndex(0);
    setLyrics(parseLRC(tracks[0]?.lrc ?? ''));
    audio.src = tracks[0]?.url ?? '';
  }, [loadState, tracks]);

  // 展开面板：挂液态玻璃滤镜（与 Dock 同源），面板浮在页面内容上可见折射。
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    glassRef.current = createLiquidGlass(panel, {
      borderRadius: 16,
      cornerSoftness: 0.25,
      blur: 12,
      contrast: 1.06,
      brightness: 1.03,
      saturate: 1.25,
      displacementStrength: 0.45,
      edgeRefractionStrength: 0.35,
      interactive: true,
    });
    return () => {
      glassRef.current?.destroy();
      glassRef.current = null;
    };
  }, []);

  // 播放进度驱动歌词高亮。
  useEffect(() => {
    const t = currentTime;
    const ls = lyrics;
    if (!ls.length) return;
    let idx = -1;
    for (let i = ls.length - 1; i >= 0; i--) {
      if (t >= ls[i].time) {
        idx = i;
        break;
      }
    }
    setCurrentLyricIndex((prev) => {
      if (prev === idx) return prev;
      // 高亮行变化后，把它滚到歌词面板中间位置，便于阅读。
      requestAnimationFrame(() => {
        if (idx < 0) return;
        const el = lyricsRef.current?.querySelector(`[data-idx="${idx}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return idx;
    });
  }, [currentTime, lyrics]);

  const loadTrack = (index: number, audio = audioRef.current, keepPlaying = false) => {
    if (!audio) return;
    const target = tracksRef.current[index];
    if (!target) return;
    // 切歌时先记住当前是否正在播放；
    // 如果用户原本在播放，换歌后自动续播，体验会更自然。
    const wasPlaying = keepPlaying || isPlaying;
    audio.pause();
    currentIndexRef.current = index;
    // 持久化当前曲目，跨页面恢复时优先回到这首歌。
    writeResumeState({ index, time: 0, playing: wasPlaying });
    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setCurrentLyricIndex(-1);
    setLyrics(parseLRC(target.lrc ?? ''));
    audio.src = target.url;
    audio.load();
    if (wasPlaying) audio.play().catch(() => {});
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  };

  const prev = () => loadTrack((currentIndex - 1 + tracks.length) % tracks.length);
  const next = () => loadTrack((currentIndex + 1) % tracks.length);

  const seekToLyric = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    // 点击歌词行，可以把播放进度跳到对应时间点。
    audio.currentTime = time;
    if (!isPlaying) audio.play().catch(() => {});
  };

  const onVolumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10) / 100;
    setVolume(v);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = v;
      audio.muted = false;
      setMuted(false);
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = parseFloat(e.target.value);
  };

  const toggleMuted = () => {
    setMuted((m) => {
      const next = !m;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  };

  const toggleLoop = () => {
    setLoopMode((l) => {
      loopModeRef.current = !l;
      return !l;
    });
  };

  const titleText = loadState === 'loading' ? '加载中…' : loadState === 'error' ? '加载失败' : (track?.name ?? '--');

  // 顶栏按钮按背景上下文切换配色：
  // 开屏（深色封面）用白色玻璃系；博客顶栏（亮色玻璃条）用深色文字 + 浅底。
  const adaptive = variant === 'adaptive';
  const trackBtnClass = adaptive
    ? 'bg-slate-900/8 text-slate-700 hover:bg-slate-900/15 dark:bg-white/12 dark:text-white/90 dark:hover:bg-white/20'
    : 'bg-white/15 hover:bg-white/25';
  const smallBtnClass = adaptive
    ? 'text-slate-600 hover:bg-slate-900/8 dark:text-white/80 dark:hover:bg-white/15'
    : 'hover:bg-white/15';

  return (
    <div
      className={`splash-player ${adaptive ? 'splash-player-adaptive' : 'splash-player-over-dark'} flex items-center gap-1 sm:gap-2 min-[380px]:gap-1.5`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={!track}
        className={`max-w-[74px] truncate rounded-full px-1.5 py-0.5 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[140px] sm:px-2 min-[380px]:max-w-[96px] min-[380px]:text-[11px] ${trackBtnClass}`}
      >
        {titleText}
        {isPlaying && (
          <span className="splash-eq" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}
      </button>
      {!compact && (
        <button
          type="button"
          onClick={prev}
          disabled={!track}
          className={`hidden rounded p-1 transition disabled:opacity-50 sm:inline-flex ${smallBtnClass}`}
          aria-label={mp.prevAria}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M6 6h2v12H6zm3 6l9-6v12z" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!track}
        className={`rounded p-1 transition disabled:opacity-50 ${smallBtnClass}`}
        aria-label={isPlaying ? mp.pauseAria : mp.playAria}
      >
        {isPlaying ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      {!compact && (
        <button
          type="button"
          onClick={next}
          disabled={!track}
          className={`hidden rounded p-1 transition disabled:opacity-50 sm:inline-flex ${smallBtnClass}`}
          aria-label={mp.nextAria}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M16 6h2v12h-2zM7 6l9 6-9 6z" />
          </svg>
        </button>
      )}
      {!compact && (
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(volume * 100)}
          onChange={onVolumeInput}
          className="player-range hidden h-[3px] w-14 cursor-pointer sm:block"
          aria-label={mp.volumeAria}
        />
      )}

      {/* 展开面板：常驻 DOM + open 类切换，保留过渡动画。 */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: 遮罩点击关闭面板，保留原交互语义 */}
      <div className={`player-overlay ${expanded ? 'open' : ''}`} onClick={() => setExpanded(false)} />
      <div ref={panelRef} className={`player-panel ${expanded ? 'open' : ''}`}>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="absolute top-3 right-3 rounded-full p-1 text-slate-500/60 transition hover:bg-slate-900/5 hover:text-slate-800 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/70"
          aria-label={mp.closeAria}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-[2] stroke-current">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <img
            src={track?.pic}
            alt={track?.name ?? ''}
            className="h-16 w-16 rounded-xl border border-slate-900/10 object-cover shadow-lg dark:border-white/10"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-800 text-sm dark:text-white">{track?.name ?? titleText}</h3>
            <p className="mt-0.5 truncate text-slate-600/70 text-xs dark:text-white/50">{track?.artist ?? ''}</p>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={onSeek}
            step="0.1"
            className="player-range-lg w-full cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500/60 dark:text-white/35">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={toggleLoop}
            className={`rounded-full p-1.5 transition ${loopMode ? 'text-[#39c5bb] dark:text-[#c084fc]' : 'text-slate-400/70 hover:text-slate-700 dark:text-white/35 dark:hover:text-white/60'}`}
            aria-label={mp.loopAria}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={prev}
            className="rounded-full p-2 text-slate-500/80 transition hover:text-slate-800 dark:text-white/55 dark:hover:text-white"
            aria-label={mp.prevAria}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M6 6h2v12H6zm3 6l9-6v12z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-full bg-[#39c5bb] p-3 text-slate-900 shadow-[#39c5bb]/25 shadow-lg transition hover:bg-[#4dd4c8] dark:bg-[#c084fc] dark:shadow-[#c084fc]/25 dark:hover:bg-[#a78bfa]"
            aria-label={isPlaying ? mp.pauseAria : mp.playAria}
          >
            {isPlaying ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-full p-2 text-slate-500/80 transition hover:text-slate-800 dark:text-white/55 dark:hover:text-white"
            aria-label={mp.nextAria}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M16 6h2v12h-2zM7 6l9 6-9 6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleMuted}
            className={`rounded-full p-1.5 transition ${muted ? 'text-[#39c5bb] dark:text-[#c084fc]' : 'text-slate-400/70 hover:text-slate-700 dark:text-white/35 dark:hover:text-white/60'}`}
            aria-label={muted ? mp.unmuteAria : mp.muteAria}
          >
            {muted ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-[2] stroke-current">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-[2] stroke-current">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            )}
          </button>
        </div>

        <div
          ref={lyricsRef}
          className="scrollbar-hide mt-3 h-36 overflow-y-auto rounded-xl bg-slate-900/5 px-3 py-2 dark:bg-white/5"
        >
          {lyrics.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400/70 text-xs dark:text-white/25">
              {mp.noLyrics}
            </div>
          ) : (
            <div className="space-y-1.5 py-14 text-center">
              {lyrics.map((line, i) => (
                <button
                  type="button"
                  key={`${line.time}-${i}`}
                  data-idx={i}
                  className={`block w-full cursor-pointer px-1 py-0.5 text-xs leading-relaxed transition-all duration-300 ${
                    i === currentLyricIndex
                      ? 'scale-[1.05] font-medium text-[#39c5bb] dark:text-[#c084fc]'
                      : Math.abs(i - currentLyricIndex) <= 1
                        ? 'text-slate-500/70 dark:text-white/35'
                        : 'text-slate-400/50 dark:text-white/18'
                  }`}
                  onClick={() => seekToLyric(line.time)}
                >
                  {line.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
