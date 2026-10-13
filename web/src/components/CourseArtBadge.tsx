import type { CSSProperties } from 'react';
import PixelCard, { type PixelCardVariant } from '../bits/PixelCard';
import SwirlCard, { type SwirlVariant } from '../bits/SwirlCard';
import SoftAurora from '../bits/SoftAurora';
import DotGrid from '../bits/DotGrid';
import LiquidEther from '../bits/LiquidEther';
import CourseEffectArt from '../bits/CourseEffectArt';
import { courseArtKey } from '../../../src/features/courses/effects';
import './CourseArtBadge.css';

export type BackgroundStyle =
  | 'ether' | 'swirl' | 'pixel' | 'aurora' | 'dotgrid'
  /* Backdrops shared with the extension: the real react-bits ports. */
  | 'light-fall' | 'magic-rings';

const SOLID_BADGE_COLORS: Record<string, string> = {
  M: '#4c1d95',   // Rich solid purple
  CS: '#1e3a8a',  // Deep cobalt blue
  CH: '#065f46',  // Deep emerald
  BIO: '#14532d', // Deep forest green
  GOV: '#881337', // Deep rose wine
  PHY: '#312e81', // Deep indigo
};

export interface CourseArtBadgeProps {
  department: string;
  code: string;
  name?: string;
  unique?: string;
  bgType?: BackgroundStyle;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  style?: CSSProperties;
}

export function CourseArtBadge({
  department,
  code,
  name,
  unique,
  bgType,
  size = 'md',
  className = '',
  style,
}: CourseArtBadgeProps) {
  const solidColor = SOLID_BADGE_COLORS[department] || '#4c1d95';
  const customStyles: CSSProperties = {
    '--badge-solid-bg': solidColor,
    ...style,
  } as CSSProperties;
  // Determine background type and palette dynamically if not explicitly given
  const derivedType: BackgroundStyle =
    bgType ??
    (department === 'M'
      ? 'ether'
      : department === 'CH'
      ? 'pixel'
      : department === 'PHY'
      ? 'aurora'
      : department === 'CS'
      ? 'pixel'
      : 'ether');

  const swirlVariant: SwirlVariant =
    department === 'M' ? 'purple' : department === 'PHY' ? 'purple' : 'cyan';

  const pixelVariant: PixelCardVariant =
    department === 'CH' ? 'emerald' : department === 'CS' ? 'blue' : 'purple';

  const rootClass = `course-badge-root course-badge-${size} course-badge-type-${derivedType} ${className}`;

  const renderBackground = () => {
    switch (derivedType) {
      case 'ether':
        return (
          <LiquidEther
            primaryColor="#7c3aed"
            secondaryColor="#c084fc"
            accentColor="#f3e8ff"
            waveSpeed={size === 'hero' ? 1.2 : 0.9}
            style={{ width: '100%', height: '100%' }}
          >
            {renderOverlay()}
          </LiquidEther>
        );

      case 'swirl':
        return (
          <SwirlCard
            variant={swirlVariant}
            speed={size === 'hero' ? '18s' : '10s'}
            style={{ width: '100%', height: '100%' }}
          >
            {renderOverlay()}
          </SwirlCard>
        );

      case 'pixel':
        return (
          <PixelCard
            variant={pixelVariant}
            gap={size === 'sm' ? 4 : 5}
            speed={35}
            style={{ width: '100%', height: '100%' }}
          >
            {renderOverlay()}
          </PixelCard>
        );

      case 'aurora':
        return (
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <SoftAurora
                color1="#7c3aed"
                color2="#c084fc"
                speed={1.6}
                scale={size === 'sm' ? 0.9 : 1.2}
              />
            </div>
            {renderOverlay()}
          </div>
        );

      case 'dotgrid':
        return (
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <DotGrid
              dotSize={4}
              gap={12}
              baseColor="#1e293b"
              activeColor="#a855f7"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
            {renderOverlay()}
          </div>
        );

      /* Backdrops the extension also uses: the same react-bits port mounted
         over the same CSS fallback art, in the shared purple palette. */
      case 'light-fall':
      case 'magic-rings':
        return (
          <>
            <CourseEffectArt
              effect={derivedType}
              artKey={courseArtKey({ code, unique, departmentCode: department })}
            />
            {renderOverlay()}
          </>
        );
    }
  };

  const renderOverlay = () => {
    const compactCode = code.replace(/\s+/g, '').toUpperCase();
    if (size === 'hero') {
      return (
        <div className="course-badge-overlay">
          <div className="hero-left">
            <div className="hero-titles">
              <span className="hero-code">{compactCode}</span>
              {name && <span className="hero-name">{name}</span>}
            </div>
          </div>
          {unique && (
            <div className="hero-right">
              <span className="hero-unique">{unique}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="course-badge-overlay">
        <span className="badge-code" data-long={compactCode.length > 6 || undefined}>{compactCode}</span>
      </div>
    );
  };

  return (
    <div className={rootClass} style={customStyles}>
      {renderBackground()}
    </div>
  );
}

export default CourseArtBadge;
