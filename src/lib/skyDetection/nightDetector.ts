import { DETECTION_THRESHOLDS } from '../../constants/detectionThresholds';
import type { LayerResult } from '../../types/skyResult';

export interface NightAnalysisResult {
  isLikelyNightSky: boolean;
  confidence: number;
  meanLuminance: number;
  variance: number;
  details: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Detects whether a dark image represents a real night sky.
 *
 * Approach:
 * 1. Compute mean luminance — if above threshold, caller should use the standard path.
 * 2. Compute luminance variance — a lens cap / covered phone has near-zero variance.
 * 3. Check vertical gradient — the top third of a night sky is typically darker than
 *    a lit horizon at the bottom.
 *
 * @param buffer  raw pixel bytes (RGBA or BGRA, 4 bytes per pixel)
 * @param width   source width in pixels
 * @param height  source height in pixels
 * @param isBGRA  byte order
 */
export function analyzeNightSky(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  isBGRA = false,
): NightAnalysisResult {
  const bytes = new Uint8Array(buffer);
  const stride = 4;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));

  let sumLum = 0;
  let sumLumSq = 0;
  let count = 0;
  let topThirdLum = 0;
  let topCount = 0;
  let bottomThirdLum = 0;
  let bottomCount = 0;

  const topBoundary = Math.floor(height / 3);
  const bottomBoundary = Math.floor((height * 2) / 3);

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * stride;
      const r = isBGRA ? bytes[i + 2] : bytes[i];
      const g = bytes[i + 1];
      const b = isBGRA ? bytes[i] : bytes[i + 2];
      // BT.601 luma
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumLum += lum;
      sumLumSq += lum * lum;
      count++;

      if (y < topBoundary) {
        topThirdLum += lum;
        topCount++;
      } else if (y >= bottomBoundary) {
        bottomThirdLum += lum;
        bottomCount++;
      }
    }
  }

  const meanLuminance = count > 0 ? sumLum / count : 0;
  const variance = count > 0 ? sumLumSq / count - meanLuminance * meanLuminance : 0;
  const stdDev = Math.sqrt(Math.max(0, variance));

  // If the scene is bright, the night path doesn't apply
  if (meanLuminance > DETECTION_THRESHOLDS.nightLuminanceThreshold) {
    return {
      isLikelyNightSky: false,
      confidence: 0,
      meanLuminance,
      variance: stdDev,
      details: `Scene too bright (lum=${meanLuminance.toFixed(0)}); use standard path`,
    };
  }

  // Variance signal — real night sky has stars / clouds / gradients
  const varianceScore = clamp(
    (stdDev - DETECTION_THRESHOLDS.nightVarianceMin) / 20,
    0,
    0.7,
  );

  // Vertical gradient signal
  const avgTop = topCount > 0 ? topThirdLum / topCount : 0;
  const avgBottom = bottomCount > 0 ? bottomThirdLum / bottomCount : 0;
  const topDarker = avgTop < avgBottom;
  const gradientBonus = topDarker ? 0.2 : 0;

  const confidence = clamp(varianceScore + gradientBonus, 0, 1);
  const isLikelyNightSky = confidence >= 0.35;

  return {
    isLikelyNightSky,
    confidence,
    meanLuminance,
    variance: stdDev,
    details: `Night path: lum=${meanLuminance.toFixed(0)}, stdDev=${stdDev.toFixed(1)}, gradient=${topDarker ? 'sky-darker' : 'flat'}`,
  };
}

export function buildNightLayerResult(result: NightAnalysisResult): LayerResult {
  return {
    layer: 'night',
    passed: result.isLikelyNightSky,
    confidence: result.confidence,
    details: result.details,
  };
}
