import { atom } from 'nanostores';

import { copy } from '../lib/copy';

/**
 * 开屏背景图的共享前端状态：
 * - `heroImages` 是静态图列表（来自 copy 配置）
 * - `heroIndex` 是「当前显示哪一张」的运行时状态
 *
 * HeroParallax 负责展示，Dock 的换图按钮负责切换，
 * 两边通过同一对 store 协作。
 */
export const heroImages = atom<readonly string[]>(copy.home.heroImages);

export const heroIndex = atom(0);

export function shuffleHeroImage() {
  const images = heroImages.get();
  if (images.length <= 1) {
    heroIndex.set(0);
    return;
  }

  const current = heroIndex.get();
  let next: number;
  do {
    // 用 do...while 避免连续两次抽到同一张图。
    next = Math.floor(Math.random() * images.length);
  } while (next === current && images.length > 1);
  heroIndex.set(next);
}
