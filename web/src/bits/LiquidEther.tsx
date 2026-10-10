import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import './LiquidEther.css';

export interface LiquidEtherProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  waveSpeed?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function LiquidEther({
  primaryColor = '#9333ea',
  secondaryColor = '#c084fc',
  accentColor = '#e9d5ff',
  waveSpeed = 1,
  className = '',
  style,
  children,
}: LiquidEtherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(10, Math.floor(rect.width));
      height = Math.max(10, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };

    const observer = new ResizeObserver(() => resize());
    observer.observe(container);
    resize();

    let t = 0;

    const render = () => {
      t += 0.016 * waveSpeed;
      const ctx = canvas.getContext('2d');
      if (ctx && width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height);

        // Render layered fluid ether wave ribbons
        const layers = [
          { freq: 0.014, amp: 18, speed: 1.2, alpha: 0.35, color: primaryColor, offset: 0 },
          { freq: 0.022, amp: 24, speed: 0.8, alpha: 0.45, color: secondaryColor, offset: Math.PI / 3 },
          { freq: 0.018, amp: 14, speed: 1.5, alpha: 0.55, color: accentColor, offset: Math.PI / 1.5 },
        ];

        for (const layer of layers) {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 4) {
            const y1 = Math.sin(x * layer.freq + t * layer.speed + layer.offset) * layer.amp;
            const y2 = Math.cos(x * layer.freq * 0.7 - t * layer.speed * 0.6) * (layer.amp * 0.6);
            const baseline = height * 0.55;
            ctx.lineTo(x, baseline + y1 + y2);
          }
          ctx.lineTo(width, height);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, height * 0.3, width, height);
          grad.addColorStop(0, `${layer.color}15`);
          grad.addColorStop(0.5, `${layer.color}60`);
          grad.addColorStop(1, `${layer.color}10`);

          ctx.fillStyle = grad;
          ctx.fill();

          ctx.strokeStyle = `${layer.color}80`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [primaryColor, secondaryColor, accentColor, waveSpeed]);

  return (
    <div
      ref={containerRef}
      className={`liquid-ether-container ${className}`}
      style={style}
    >
      <div className="liquid-ether-plasma" />
      <canvas ref={canvasRef} className="liquid-ether-canvas" />
      <div className="liquid-ether-vignette" />
      <div className="liquid-ether-content">{children}</div>
    </div>
  );
}

export default LiquidEther;
