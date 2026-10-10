import type { CSSProperties, ReactNode } from 'react';
import './SwirlCard.css';

export type SwirlVariant = 'orange' | 'cyan' | 'purple' | 'emerald' | 'crimson';

export interface SwirlCardProps {
  variant?: SwirlVariant;
  colors?: [string, string, string];
  speed?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const SWIRL_PALETTES: Record<SwirlVariant, [string, string, string]> = {
  orange: ['#bf5700', '#f97316', '#ffedd5'], // UT Burnt Orange
  cyan: ['#0284c7', '#06b6d4', '#e0f2fe'],   // Sapphire / Cyan
  purple: ['#581c87', '#9333ea', '#fae8ff'], // Ultraviolet / Violet
  emerald: ['#047857', '#10b981', '#ecfdf5'], // Neon Emerald
  crimson: ['#991b1b', '#ef4444', '#fee2e2'], // Crimson / Ruby
};

export function SwirlCard({
  variant = 'orange',
  colors,
  speed = '14s',
  className = '',
  style,
  children,
}: SwirlCardProps) {
  const [c1, c2, c3] = colors ?? SWIRL_PALETTES[variant] ?? SWIRL_PALETTES.orange;

  const customVars = {
    '--swirl-c1': c1,
    '--swirl-c2': c2,
    '--swirl-c3': c3,
    '--swirl-speed': speed,
    ...style,
  } as CSSProperties;

  return (
    <div className={`swirl-card-container ${className}`} style={customVars}>
      <div className="swirl-layers">
        <div className="swirl-layer-1" />
        <div className="swirl-layer-2" />
        <div className="swirl-layer-3" />
      </div>
      <div className="swirl-vignette" />
      <div className="swirl-card-content">{children}</div>
    </div>
  );
}

export default SwirlCard;
