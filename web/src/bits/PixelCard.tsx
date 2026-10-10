import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import './PixelCard.css';

export type PixelCardVariant = 'default' | 'blue' | 'yellow' | 'pink' | 'emerald' | 'orange' | 'purple';

export interface PixelCardProps {
  variant?: PixelCardVariant;
  gap?: number;
  speed?: number;
  colors?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const VARIANTS: Record<PixelCardVariant, string[]> = {
  default: ['#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a'],
  blue: ['#082f49', '#0369a1', '#0284c7', '#38bdf8', '#7dd3fc'],
  yellow: ['#422006', '#854d0e', '#ca8a04', '#eab308', '#fef08a'],
  pink: ['#500724', '#9d174d', '#db2777', '#f472b6', '#fbcfe8'],
  emerald: ['#022c22', '#064e3b', '#059669', '#10b981', '#6ee7b7'],
  orange: ['#431407', '#9a3412', '#c2410c', '#f97316', '#fdba74'],
  purple: ['#2e1065', '#581c87', '#7c3aed', '#a855f7', '#d8b4fe'],
};

interface Pixel {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  step: number;
}

export function PixelCard({
  variant = 'emerald',
  gap = 5,
  speed = 30,
  colors,
  className = '',
  style,
  children,
}: PixelCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let pixels: Pixel[] = [];
    const colorPalette = colors ? colors.split(',').map((c) => c.trim()) : VARIANTS[variant] ?? VARIANTS.emerald;

    const pointer = {
      x: -1000,
      y: -1000,
      isHovered: false,
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);

      // Re-initialize pixels
      const step = Math.max(3, gap);
      const cols = Math.ceil(rect.width / step);
      const rows = Math.ceil(rect.height / step);
      pixels = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
          const initialAlpha = Math.random() < 0.18 ? Math.random() * 0.4 + 0.1 : 0.04;
          pixels.push({
            x: c * step,
            y: r * step,
            size: step - 1,
            color: randomColor,
            alpha: initialAlpha,
            targetAlpha: initialAlpha,
            step: (Math.random() * 0.02 + 0.01) * (speed / 20),
          });
        }
      }
    };

    resize();
    const observer = new ResizeObserver(() => resize());
    observer.observe(container);

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.isHovered = true;
    };

    const onPointerLeave = () => {
      pointer.isHovered = false;
      pointer.x = -1000;
      pointer.y = -1000;
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    let lastTime = 0;
    const render = (time: number) => {
      const dt = time - lastTime;
      if (dt > 16) {
        lastTime = time;
        const rect = container.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Randomly pick a few idle pixels to sparkle
        const sparkleCount = Math.floor(pixels.length * 0.015);
        for (let i = 0; i < sparkleCount; i++) {
          const p = pixels[Math.floor(Math.random() * pixels.length)];
          if (p) {
            p.targetAlpha = Math.random() * 0.55 + 0.15;
            p.color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
          }
        }

        const prox = 42; // radius for pointer glow
        const proxSq = prox * prox;

        for (let i = 0; i < pixels.length; i++) {
          const p = pixels[i];

          if (pointer.isHovered) {
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < proxSq) {
              const boost = 1 - distSq / proxSq;
              p.targetAlpha = Math.max(p.targetAlpha, boost * 0.95);
            }
          }

          // Smoothly interpolate alpha towards target
          if (p.alpha < p.targetAlpha) {
            p.alpha = Math.min(p.targetAlpha, p.alpha + p.step);
          } else {
            p.alpha = Math.max(0.04, p.alpha - p.step * 0.4);
          }

          if (Math.abs(p.alpha - p.targetAlpha) < 0.01 && !pointer.isHovered) {
            p.targetAlpha = 0.04 + Math.random() * 0.06;
          }

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [variant, gap, speed, colors]);

  return (
    <div
      ref={containerRef}
      className={`pixel-card-container ${className}`}
      style={style}
    >
      <canvas ref={canvasRef} className="pixel-card-canvas" />
      <div className="pixel-card-content">{children}</div>
    </div>
  );
}

export default PixelCard;
