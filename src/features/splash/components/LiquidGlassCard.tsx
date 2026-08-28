import { createLiquidGlass, type LiquidGlassController } from '@lib/liquidGlass';
import { type ReactNode, useEffect, useRef } from 'react';

interface Props {
  width?: string;
  maxWidth?: string;
  padding?: string;
  borderRadius?: number;
  cornerSoftness?: number;
  displacementStrength?: number;
  edgeRefractionStrength?: number;
  blur?: number;
  contrast?: number;
  brightness?: number;
  saturate?: number;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * 「液态玻璃」容器：
 * 1. 暴露尺寸/效果 props API，给页面和业务组件使用
 * 2. 挂载后调用 `createLiquidGlass()`，把真正的玻璃折射滤镜挂到 DOM 上
 *
 * 开屏页视觉固定为亮色玻璃、不跟随站点主题切换。
 */
export default function LiquidGlassCard({
  width = '100%',
  maxWidth = '800px',
  padding = '30px 50px',
  borderRadius = 24,
  cornerSoftness = 0.12,
  displacementStrength = 1,
  edgeRefractionStrength = 0.75,
  blur = 0.3,
  contrast = 1.14,
  brightness = 1.04,
  saturate = 1.08,
  interactive = true,
  className = '',
  children,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<LiquidGlassController | null>(null);

  const liquidOptions = {
    borderRadius,
    cornerSoftness,
    displacementStrength,
    edgeRefractionStrength,
    blur,
    contrast,
    brightness,
    saturate,
    interactive,
  };

  // 挂载时创建滤镜，卸载时释放。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 初始创建只跑一次，后续参数变化由下方 effect 同步
  useEffect(() => {
    if (!frameRef.current) return;
    controllerRef.current = createLiquidGlass(frameRef.current, liquidOptions);
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);
  // 外部参数变化时同步更新滤镜。
  // biome-ignore lint/correctness/useExhaustiveDependencies: liquidOptions 每次渲染重建，刻意省略对象本身避免每帧重复 update
  useEffect(() => {
    controllerRef.current?.update(liquidOptions);
  }, [blur, brightness, contrast, cornerSoftness, displacementStrength, edgeRefractionStrength, interactive, saturate]);

  return (
    <div
      ref={frameRef}
      className={`liquid-glass-frame ${className}`.trim()}
      style={{ width, maxWidth, padding, borderRadius: `${borderRadius}px` }}
    >
      <div className="liquid-glass-content">{children}</div>
    </div>
  );
}
