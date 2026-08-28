import MusicPlayer from '@components/music/MusicPlayer';
import type { BgmAudioGroup } from '@lib/config/types';

import SplashThemeToggle from './SplashThemeToggle';
import SystemClock from './SystemClock';

interface Props {
  /** 与博客 bgm 同源的歌单配置（config/site.yaml → bgm.audio） */
  audioGroups: BgmAudioGroup[];
  /** Meting API 地址（config/site.yaml → bgm.metingApi，可选） */
  metingApi?: string;
}

/**
 * 开屏顶栏小组件：音乐 + 时钟。
 * 音乐数据源与博客全局 BGM 统一（网易云歌单，Meting API 解析）。
 */
export default function HomeTopbarWidgets({ audioGroups, metingApi }: Props) {
  return (
    <div className="flex items-center gap-1 text-[11px] sm:gap-3 min-[380px]:gap-1.5">
      <MusicPlayer audioGroups={audioGroups} metingApi={metingApi} variant="over-dark" />
      <span className="hidden min-[430px]:inline-flex">
        <SystemClock />
      </span>
      <span className="splash-theme-toggle hidden min-[380px]:inline-flex">
        <SplashThemeToggle />
      </span>
    </div>
  );
}
