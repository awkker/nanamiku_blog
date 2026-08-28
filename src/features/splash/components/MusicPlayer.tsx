import { useEffect, useRef, useState } from 'react';

import { copy } from '../lib/copy';

const mp = copy.components.musicPlayer;

interface Track {
  title: string;
  artist: string;
  src: string;
  cover: string;
  lrcUrl: string;
}

interface LyricLine {
  time: number;
  text: string;
}

/**
 * 纯静态前端歌单（不接后端）。
 * 如果未来要换歌，主要替换的就是 `playlist` 数据来源。
 */
const playlist: Track[] = [
  {
    title: 'からくりピエロ',
    artist: '40mP, 初音ミク',
    src: '/music/karakuri-pierrot.mp3',
    cover: '/music/musicimage/40mp.jpg',
    lrcUrl: '/music/lrc/karakuri-pierrot.lrc',
  },
  {
    title: 'ODDS&ENDS',
    artist: 'ryo (supercell), 初音ミク',
    src: '/music/odds-and-ends.mp3',
    cover: '/music/musicimage/ryo.jpg',
    lrcUrl: '/music/lrc/odds-and-ends.lrc',
  },
];

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

export default function MusicPlayer() {
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
  const loopModeRef = useRef(false);
  const currentIndexRef = useRef(0);
  const currentTimeRef = useRef(0);

  const currentTrack = playlist[currentIndex];

  // 只维护一个 Audio 实例，切歌时替换 src。
  // biome-ignore lint/correctness/useExhaustiveDependencies: Audio 实例只在挂载时创建一次，后续通过 ref 访问
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = 0.45;
    audio.src = playlist[0].src;

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => {
      currentTimeRef.current = audio.currentTime;
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      // 单曲循环时回到 0 秒继续播；否则进入下一首。
      if (loopModeRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        loadTrack((currentIndexRef.current + 1) % playlist.length, audio, true);
      }
    });
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audioRef.current = audio;

    const fetchLyrics = async (url: string) => {
      try {
        // 歌词单独按文本文件读取，失败时降级成「暂无歌词」。
        const res = await fetch(url);
        setLyrics(res.ok ? parseLRC(await res.text()) : []);
      } catch {
        setLyrics([]);
      }
    };
    void fetchLyrics(playlist[0].lrcUrl);

    return () => {
      // 组件销毁时停掉音频并清空资源地址，避免残留播放。
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchLyricsFor = async (url: string) => {
    try {
      const res = await fetch(url);
      setLyrics(res.ok ? parseLRC(await res.text()) : []);
    } catch {
      setLyrics([]);
    }
  };

  const loadTrack = (index: number, audio = audioRef.current, keepPlaying = false) => {
    if (!audio) return;
    // 切歌时先记住当前是否正在播放；
    // 如果用户原本在播放，换歌后自动续播，体验会更自然。
    const wasPlaying = keepPlaying || isPlaying;
    audio.pause();
    currentIndexRef.current = index;
    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setCurrentLyricIndex(-1);
    audio.src = playlist[index].src;
    audio.load();
    void fetchLyricsFor(playlist[index].lrcUrl);
    if (wasPlaying) audio.play().catch(() => {});
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  };

  const prev = () => loadTrack((currentIndex - 1 + playlist.length) % playlist.length);
  const next = () => loadTrack((currentIndex + 1) % playlist.length);

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

  return (
    <div className="flex items-center gap-1 sm:gap-2 min-[380px]:gap-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="max-w-[74px] truncate rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] transition hover:bg-white/25 sm:max-w-[140px] sm:px-2 min-[380px]:max-w-[96px] min-[380px]:text-[11px]"
      >
        {currentTrack.title}
        {isPlaying && (
          <span className="splash-eq" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={prev}
        className="hidden rounded p-1 transition hover:bg-white/15 sm:inline-flex"
        aria-label={mp.prevAria}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
          <path d="M6 6h2v12H6zm3 6l9-6v12z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={togglePlay}
        className="rounded p-1 transition hover:bg-white/15"
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
      <button
        type="button"
        onClick={next}
        className="hidden rounded p-1 transition hover:bg-white/15 sm:inline-flex"
        aria-label={mp.nextAria}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
          <path d="M16 6h2v12h-2zM7 6l9 6-9 6z" />
        </svg>
      </button>
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(volume * 100)}
        onChange={onVolumeInput}
        className="player-range hidden h-[3px] w-14 cursor-pointer sm:block"
        aria-label={mp.volumeAria}
      />

      {/* 展开面板：常驻 DOM + open 类切换，保留过渡动画。 */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: 遮罩点击关闭面板，保留原交互语义 */}
      <div className={`player-overlay ${expanded ? 'open' : ''}`} onClick={() => setExpanded(false)} />
      <div className={`player-panel ${expanded ? 'open' : ''}`}>
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
            src={currentTrack.cover}
            alt={currentTrack.title}
            className="h-16 w-16 rounded-xl border border-slate-900/10 object-cover shadow-lg dark:border-white/10"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-800 text-sm dark:text-white">{currentTrack.title}</h3>
            <p className="mt-0.5 truncate text-slate-600/70 text-xs dark:text-white/50">{currentTrack.artist}</p>
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
            className={`rounded-full p-1.5 transition ${loopMode ? 'text-[#39c5bb]' : 'text-slate-400/70 hover:text-slate-700 dark:text-white/35 dark:hover:text-white/60'}`}
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
            className="rounded-full bg-[#39c5bb] p-3 text-slate-900 shadow-[#39c5bb]/25 shadow-lg transition hover:bg-[#4dd4c8]"
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
            className={`rounded-full p-1.5 transition ${muted ? 'text-[#39c5bb]' : 'text-slate-400/70 hover:text-slate-700 dark:text-white/35 dark:hover:text-white/60'}`}
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
                      ? 'scale-[1.05] font-medium text-[#39c5bb]'
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
