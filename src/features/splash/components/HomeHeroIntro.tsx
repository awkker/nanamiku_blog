import { copy } from '../lib/copy';
import TypewriterSubtitle from './TypewriterSubtitle';

/**
 * 开屏中央主视觉区：主标题（渐变流动）+ 副标题打字机。
 * 文案直接来自静态 copy 配置。
 */
export default function HomeHeroIntro() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="hero-title animate-fade-up text-[clamp(2.9rem,7.4vw,5.6rem)] tracking-[0.03em]">
        <span className="hero-text">{copy.home.heroTitle}</span>
      </h1>
      <TypewriterSubtitle text={copy.home.heroSubtitle} />
    </div>
  );
}
