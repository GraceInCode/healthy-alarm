import { SKY_HSV_RANGES, type HsvRange } from '../../constants/hsvRanges';
import { DETECTION_THRESHOLDS } from '../../constants/detectionThresholds';
import type { LayerResult } from '../../types/skyResult';

/**
 * Convert an RGB pixel (0–255 each) to HSV (H: 0–360, S: 0–255, V: 0–255).
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  const V = max * 255;
  const S = max === 0 ? 0 : (delta / max) * 255;

  let H = 0;
  if (delta !== 0) {
    if (max === rn) {
      H = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      H = 60 * ((bn - rn) / delta + 2);
    } else {
      H = 60 * ((rn - gn) / delta + 4);
    }
  }
  H = (H + 360) % 360;

  return [H, S, V];
}

function pixelMatchesRange(h: number, s: number, v: number, range: HsvRange): boolean {
  if (range.hMin <= range.hMax) {
    if (h < range.hMin || h > range.hMax) return false;
  } else {
    // wrapping range (e.g. 350–10 for red)
    if (h < range.hMin && h > range.hMax) return false;
  }
  return s >= range.sMin && s <= range.sMax && v >= range.vMin && v <= range.vMax;
}

export interface HsvAnalysisResult {
  skyRatio: number;
  dominantCondition: string;
  confidence: number;
}

/**
 * Analyse a raw RGBA/BGRA buffer (4 bytes per pixel) at reduced resolution.
 * Downsamples to ~64×64 for performance.
 * @param buffer  raw pixel bytes (RGBA or BGRA layout)
 * @param width   source width in pixels
 * @param height  source height in pixels
 * @param isBGRA  true if byte order is BGRA (common on iOS); false = RGBA
 */
export function analyzeHsvSkyRatio(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  isBGRA = false,
): HsvAnalysisResult {
  const bytes = new Uint8Array(buffer);
  const stride = 4; // bytes per pixel (RGBA or BGRA)

  const targetSize = 64;
  const stepX = Math.max(1, Math.floor(width / targetSize));
  const stepY = Math.max(1, Math.floor(height / targetSize));

  const labelCounts: Record<string, number> = {};
  let skyPixels = 0;
  let totalPixels = 0;

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const i = (y * width + x) * stride;
      const r = isBGRA ? bytes[i + 2] : bytes[i];
      const g = bytes[i + 1];
      const b = isBGRA ? bytes[i] : bytes[i + 2];

      const [h, s, v] = rgbToHsv(r, g, b);
      totalPixels++;

      for (const range of SKY_HSV_RANGES) {
        if (pixelMatchesRange(h, s, v, range)) {
          skyPixels++;
          labelCounts[range.label] = (labelCounts[range.label] ?? 0) + 1;
          break;
        }
      }
    }
  }

  const skyRatio = totalPixels > 0 ? skyPixels / totalPixels : 0;
  const dominantCondition =
    Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

  // Confidence is clamped to 0–1 using the medium threshold as midpoint
  const threshold = DETECTION_THRESHOLDS.hsvSkyPixelRatio.medium;
  const confidence = Math.min(1, skyRatio / (threshold * 2));

  return { skyRatio, dominantCondition, confidence };
}

export function buildHsvLayerResult(
  result: HsvAnalysisResult,
  sensitivity: 'low' | 'medium' | 'high',
): LayerResult {
  const threshold = DETECTION_THRESHOLDS.hsvSkyPixelRatio[sensitivity];
  const passed = result.skyRatio >= threshold;
  return {
    layer: 'hsv',
    passed,
    confidence: result.confidence,
    details: `${(result.skyRatio * 100).toFixed(1)}% sky pixels (${result.dominantCondition}); threshold ${(threshold * 100).toFixed(0)}%`,
  };
}
