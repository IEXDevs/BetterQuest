/** The real react-bits effects, keyed by the curated course-effect allowlist.
 *  Every effect renders into an absolutely-positioned layer; when a mount
 *  returns null (no WebGL, animation frames unavailable, …) callers keep the
 *  CSS fallback art from `effects.ts`. */

import type { CourseEffect } from '../effects';
import type { EffectMount } from './shared';
import { mountLiquidEther } from './ether';
import { mountPixelBlast } from './pixel';
import { mountMicroSlats } from './micro-slats';
import { mountGhostFibres } from './ghost-fibres';
import { mountCrtWarp } from './crt-warp';
import { mountScanner } from './scanner';
import { mountLightFall } from './light-fall';
import { mountFerrofluid } from './ferrofluid';
import { mountLineWaves } from './line-waves';
import { mountRadar } from './radar';
import { mountMagicRings } from './magic-rings';
import { mountFloatingLines } from './floating-lines';
import { mountGridScan } from './grid-scan';
import { mountGradientBlinds } from './gradient-blinds';
import { mountIridescence } from './iridescence';
import { mountLetterGlitch } from './letter-glitch';
import { mountStrands } from './strands';

export type { EffectInstance, EffectMount } from './shared';

export const REACTBITS_EFFECTS: Record<CourseEffect, EffectMount> = {
  ether: mountLiquidEther,
  pixel: mountPixelBlast,
  'micro-slats': mountMicroSlats,
  'ghost-fibres': mountGhostFibres,
  'crt-warp': mountCrtWarp,
  scanner: mountScanner,
  'light-fall': mountLightFall,
  ferrofluid: mountFerrofluid,
  'line-waves': mountLineWaves,
  radar: mountRadar,
  'magic-rings': mountMagicRings,
  'floating-lines': mountFloatingLines,
  'grid-scan': mountGridScan,
  'gradient-blinds': mountGradientBlinds,
  iridescence: mountIridescence,
  'letter-glitch': mountLetterGlitch,
  strands: mountStrands,
};
