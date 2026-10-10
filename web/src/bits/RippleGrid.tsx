import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import './RippleGrid.css';

export interface RippleGridProps {
  gridSize?: number;
  gridColor?: string;
  rippleColor?: string;
  glowColor?: string;
  rippleSpeed?: number;
  mouseInteraction?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  strength: number;
  wavelength: number;
}

export function RippleGrid({
  gridSize = 22,
  gridColor = '#a855f7',
  rippleColor = '#e9d5ff',
  glowColor = '#7c3aed',
  rippleSpeed = 1.2,
  mouseInteraction = true,
  className = '',
  style,
  children,
}: RippleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const lastAmbientRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

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

    // Helper to spawn a ripple
    const addRipple = (x: number, y: number, strength = 1.0) => {
      const maxRadius = Math.hypot(width, height) * 1.1;
      ripplesRef.current.push({
        x,
        y,
        radius: 0,
        maxRadius,
        speed: (width > 200 ? 1.6 : 1.1) * rippleSpeed,
        strength,
        wavelength: 28,
      });
      // Cap max ripples to 8
      if (ripplesRef.current.length > 8) ripplesRef.current.shift();
    };

    // Spawn an initial ripple in the center
    addRipple(width / 2, height / 2, 1.2);

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 2.5);
      lastTime = time;

      const ctx = canvas.getContext('2d');
      if (ctx && width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height);

        // Ambient ripple spawn every 2.4 seconds
        if (time - lastAmbientRef.current > 2400) {
          lastAmbientRef.current = time;
          const rx = width * (0.35 + Math.random() * 0.3);
          const ry = height * (0.35 + Math.random() * 0.3);
          addRipple(rx, ry, 0.95);
        }

        // Update active ripples
        const activeRipples = ripplesRef.current;
        for (let i = activeRipples.length - 1; i >= 0; i--) {
          const rip = activeRipples[i];
          rip.radius += rip.speed * dt * 2.2;
          if (rip.radius >= rip.maxRadius) {
            activeRipples.splice(i, 1);
          }
        }

        // Calculate ripple wave function at (x, y)
        const getWave = (px: number, py: number): number => {
          let total = 0;
          for (let i = 0; i < activeRipples.length; i++) {
            const rip = activeRipples[i];
            const dist = Math.hypot(px - rip.x, py - rip.y);
            const delta = dist - rip.radius;
            if (Math.abs(delta) < rip.wavelength * 2.5) {
              const progress = rip.radius / rip.maxRadius;
              const decay = Math.max(0, 1 - progress);
              const wave = Math.sin((delta / rip.wavelength) * Math.PI * 2);
              const envelope = Math.exp(-Math.pow(delta / (rip.wavelength * 0.8), 2));
              total += wave * envelope * decay * rip.strength;
            }
          }
          return total;
        };

        const cols = Math.ceil(width / gridSize) + 1;
        const rows = Math.ceil(height / gridSize) + 1;

        // Draw horizontal grid lines with ripple displacement and glow
        for (let r = 0; r < rows; r++) {
          const gy = r * gridSize;
          ctx.beginPath();
          let started = false;
          for (let c = 0; c < cols; c++) {
            const gx = c * gridSize;
            const wave = getWave(gx, gy);
            const py = gy - wave * 4.5;
            if (!started) {
              ctx.moveTo(gx, py);
              started = true;
            } else {
              ctx.lineTo(gx, py);
            }
          }
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.16)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Draw vertical grid lines
        for (let c = 0; c < cols; c++) {
          const gx = c * gridSize;
          ctx.beginPath();
          let started = false;
          for (let r = 0; r < rows; r++) {
            const gy = r * gridSize;
            const wave = getWave(gx, gy);
            const px = gx + wave * 2.5;
            if (!started) {
              ctx.moveTo(px, gy);
              started = true;
            } else {
              ctx.lineTo(px, gy);
            }
          }
          ctx.strokeStyle = 'rgba(147, 51, 234, 0.14)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Draw glowing wave rings and highlighted node points
        for (let r = 0; r < rows; r++) {
          const gy = r * gridSize;
          for (let c = 0; c < cols; c++) {
            const gx = c * gridSize;
            const wave = getWave(gx, gy);
            const intensity = Math.max(0, wave);

            if (intensity > 0.08) {
              const nodeRadius = 1.0 + intensity * 2.8;
              const glowAlpha = Math.min(1, intensity * 1.4);

              // Luminous intersection dot
              ctx.fillStyle = `rgba(233, 213, 255, ${glowAlpha})`;
              ctx.beginPath();
              ctx.arc(gx, gy - wave * 4.5, nodeRadius, 0, Math.PI * 2);
              ctx.fill();

              // Bloom halo
              if (intensity > 0.35) {
                ctx.fillStyle = `rgba(168, 85, 247, ${glowAlpha * 0.45})`;
                ctx.beginPath();
                ctx.arc(gx, gy - wave * 4.5, nodeRadius * 2.6, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }

        // Faint circular wave contours
        for (let i = 0; i < activeRipples.length; i++) {
          const rip = activeRipples[i];
          const alpha = (1 - rip.radius / rip.maxRadius) * 0.22 * rip.strength;
          if (alpha > 0.01) {
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(192, 132, 252, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    const handlePointerMove = (e: PointerEvent) => {
      if (!mouseInteraction) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        addRipple(x, y, 1.1);
      }
    };

    container.addEventListener('pointerdown', handlePointerMove);
    container.addEventListener('pointerenter', handlePointerMove);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('pointerdown', handlePointerMove);
      container.removeEventListener('pointerenter', handlePointerMove);
    };
  }, [gridSize, gridColor, rippleColor, glowColor, rippleSpeed, mouseInteraction]);

  return (
    <div
      ref={containerRef}
      className={`ripple-grid-container ${className}`}
      style={style}
    >
      <div className="ripple-grid-ambient-glow" />
      <canvas ref={canvasRef} className="ripple-grid-canvas" />
      <div className="ripple-grid-vignette" />
      <div className="ripple-grid-content">{children}</div>
    </div>
  );
}

export default RippleGrid;
