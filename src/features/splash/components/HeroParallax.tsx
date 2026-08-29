import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';

import { copy } from '../lib/copy';
import { heroImages, heroIndex, shuffleHeroImage } from '../stores/heroImage';

const hp = copy.components.heroParallax;

const RANGE = 10;
const SHIFT = 18;

/**
 * 开屏背景视差层：鼠标移动产生 3D 视差，配合封面轮播。
 * `heroIndex` 与 Dock 的换图按钮共享。
 */
export default function HeroParallax() {
  const $heroIndex = useStore(heroIndex);
  const $heroImages = useStore(heroImages);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // store 索引变化时同步展示状态。
  useEffect(() => {
    setCurrentIndex($heroIndex);
  }, [$heroIndex]);

  // 首次进入随机挑一张图，避免每次都从同一张开始。
  useEffect(() => {
    shuffleHeroImage();
    setCurrentIndex(heroIndex.get());
  }, []);

  // 鼠标视差 + 缓动循环。
  useEffect(() => {
    const container = containerRef.current;
    const layer = layerRef.current;
    if (!container || !layer) return;

    let rx = 0;
    let ry = 0;
    let tx = 0;
    let ty = 0;
    let targetRx = 0;
    let targetRy = 0;
    let targetTx = 0;
    let targetTy = 0;
    let rafId = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const loop = () => {
      rx = lerp(rx, targetRx, 0.06);
      ry = lerp(ry, targetRy, 0.06);
      tx = lerp(tx, targetTx, 0.06);
      ty = lerp(ty, targetTy, 0.06);

      layer.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateX(${tx.toFixed(1)}px) translateY(${ty.toFixed(1)}px)`;
      rafId = requestAnimationFrame(loop);
    };

    const onMouseMove = (e: MouseEvent) => {
      // 把鼠标位置归一化成 -1 到 1 的比例，这样无论屏幕多大，视差公式都能复用。
      const w = window.innerWidth;
      const h = window.innerHeight;
      const xRatio = (e.clientX / w - 0.5) * 2;
      const yRatio = (e.clientY / h - 0.5) * 2;

      targetRy = xRatio * RANGE;
      targetRx = -yRatio * RANGE;
      targetTx = -xRatio * SHIFT;
      targetTy = -yRatio * SHIFT;
    };

    const onMouseLeave = () => {
      // 鼠标离开后目标值重置到中心点，背景缓慢回正。
      targetRx = 0;
      targetRy = 0;
      targetTx = 0;
      targetTy = 0;
    };

    container.addEventListener('mousemove', onMouseMove, { passive: true });
    container.addEventListener('mouseleave', onMouseLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // 只渲染「当前图 + 下一张预热」，避免首屏加载全部轮播图。
  const visibleImages = [$heroImages[currentIndex], $heroImages[(currentIndex + 1) % $heroImages.length]];

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ perspective: '1200px' }}>
      <div
        ref={layerRef}
        className="parallax-layer absolute"
        style={{ transform: 'rotateX(0deg) rotateY(0deg) translateX(0px) translateY(0px)' }}
      >
        {visibleImages.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${hp.coverAltPrefix}${i + 1}`}
            className={`parallax-img absolute inset-0 h-full w-full object-cover ${i === 0 ? 'is-active' : ''}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
