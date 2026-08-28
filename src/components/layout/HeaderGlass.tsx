import { createLiquidGlass } from '@lib/liquidGlass';
import { useEffect } from 'react';

/**
 * 顶栏液态玻璃：挂载后给 #site-header 应用液态玻璃滤镜与玻璃样式。
 *
 * 说明：
 * - 只负责「贴膜」，导航/主题切换/滚动控制等原功能全部不变（Navigator 继续管理 with-background）。
 * - #site-header 是 View Transition 的 persist 元素（跨页面保留 DOM），
 *   因此用 data 标记保证滤镜只初始化一次，且不随页面切换销毁重建。
 */
export default function HeaderGlass() {
  useEffect(() => {
    const header = document.getElementById('site-header');
    if (!header || header.dataset.liquidGlass === 'active') return;

    header.dataset.liquidGlass = 'active';
    header.classList.add('liquid-header');

    createLiquidGlass(header, {
      borderRadius: 0,
      cornerSoftness: 0.2,
      // 玻璃虚化与质感参数（与开屏 Dock 同源，可按需调整）
      blur: 10,
      contrast: 1.06,
      brightness: 1.02,
      saturate: 1.25,
      displacementStrength: 0.55,
      edgeRefractionStrength: 0.5,
      interactive: true,
    });
  }, []);

  return null;
}
