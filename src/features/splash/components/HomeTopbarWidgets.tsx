import MusicPlayer from './MusicPlayer';
import SystemClock from './SystemClock';

/**
 * 纯静态开屏的顶栏小组件：音乐 + 时钟。
 * 天气组件依赖旧后端 /weather 接口，已按需求移除。
 */
export default function HomeTopbarWidgets() {
  return (
    <div className="flex items-center gap-1 text-[11px] sm:gap-3 min-[380px]:gap-1.5">
      <MusicPlayer />
      <span className="hidden min-[430px]:inline-flex">
        <SystemClock />
      </span>
    </div>
  );
}
