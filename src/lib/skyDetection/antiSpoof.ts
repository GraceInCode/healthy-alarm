import { DETECTION_THRESHOLDS } from '../../constants/detectionThresholds';
import type { AntiSpoofResult, MotionSample } from '../../types/skyResult';

// ─── FFT (Cooley-Tukey radix-2) ─────────────────────────────────────────────

function fft1d(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

/**
 * Detect Moiré patterns (periodic artefacts from photographing a screen).
 * Downsamples to 128×128, extracts the green channel, runs a 2D FFT,
 * and checks whether mid-band spatial frequencies dominate.
 *
 * Returns `true` if Moiré is detected (i.e. the image is likely a screen photo).
 */
export function detectMoirePattern(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  isBGRA = false,
): boolean {
  const SIZE = 128;
  const src = new Uint8Array(buffer);
  const scaleX = width / SIZE;
  const scaleY = height / SIZE;

  // Extract green channel into SIZE×SIZE grid
  const green = new Float64Array(SIZE * SIZE);
  let meanG = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.min(Math.floor(x * scaleX), width - 1);
      const sy = Math.min(Math.floor(y * scaleY), height - 1);
      const g = src[(sy * width + sx) * 4 + 1];
      green[y * SIZE + x] = g;
      meanG += g;
    }
  }
  meanG /= SIZE * SIZE;
  // Remove DC
  for (let i = 0; i < green.length; i++) green[i] -= meanG;

  // 2D FFT: transform rows, then columns
  const re = new Float64Array(SIZE * SIZE);
  const im = new Float64Array(SIZE * SIZE);
  re.set(green);

  // Row FFTs
  for (let y = 0; y < SIZE; y++) {
    const rowRe = re.slice(y * SIZE, y * SIZE + SIZE);
    const rowIm = im.slice(y * SIZE, y * SIZE + SIZE);
    fft1d(rowRe, rowIm);
    re.set(rowRe, y * SIZE);
    im.set(rowIm, y * SIZE);
  }
  // Column FFTs
  for (let x = 0; x < SIZE; x++) {
    const colRe = new Float64Array(SIZE);
    const colIm = new Float64Array(SIZE);
    for (let y = 0; y < SIZE; y++) {
      colRe[y] = re[y * SIZE + x];
      colIm[y] = im[y * SIZE + x];
    }
    fft1d(colRe, colIm);
    for (let y = 0; y < SIZE; y++) {
      re[y * SIZE + x] = colRe[y];
      im[y * SIZE + x] = colIm[y];
    }
  }

  // Compute power spectrum and sum by frequency band
  let lowBand = 0;
  let midBand = 0;
  let highBand = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = y * SIZE + x;
      const power = re[idx] * re[idx] + im[idx] * im[idx];
      const fx = Math.min(x, SIZE - x);
      const fy = Math.min(y, SIZE - y);
      const freq = Math.sqrt(fx * fx + fy * fy);
      if (freq < 8) lowBand += power;
      else if (freq <= 48) midBand += power;
      else highBand += power;
    }
  }

  const total = lowBand + midBand + highBand;
  if (total === 0) return false;
  const moireScore = midBand / total;
  return moireScore > DETECTION_THRESHOLDS.antiSpoof.moireFrequencyThreshold;
}

/**
 * Check luminance variance of a pixel buffer.
 * Real outdoor photos typically have stdDev 15–40.
 * Printed/screen replay photos are too uniform (stdDev ~2–8).
 */
export function checkLuminanceVariance(buffer: ArrayBuffer, isBGRA = false): boolean {
  const src = new Uint8Array(buffer);
  const pixelCount = src.length / 4;
  if (pixelCount === 0) return true;

  let sumLum = 0;
  let sumLumSq = 0;
  for (let i = 0; i < src.length; i += 4) {
    const r = isBGRA ? src[i + 2] : src[i];
    const g = src[i + 1];
    const b = isBGRA ? src[i] : src[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumLum += lum;
    sumLumSq += lum * lum;
  }

  const mean = sumLum / pixelCount;
  const variance = sumLumSq / pixelCount - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));
  return stdDev >= DETECTION_THRESHOLDS.antiSpoof.luminanceVarianceMin;
}

/**
 * Check if the accelerometer samples show real phone movement
 * (proves the user is holding the phone in the real world, not
 * pointing at a static printed photo).
 */
export function checkMotionLiveness(samples: MotionSample[]): boolean {
  if (samples.length < 5) return false;

  const GRAVITY = 9.8;
  let totalMotion = 0;

  for (const s of samples) {
    const magnitude = Math.sqrt(s.ax * s.ax + s.ay * s.ay + s.az * s.az);
    totalMotion += Math.abs(magnitude - GRAVITY);
  }

  const avgMotion = totalMotion / samples.length;
  return avgMotion > DETECTION_THRESHOLDS.antiSpoof.motionMagnitudeThreshold;
}

/**
 * Run all anti-spoof checks. Fails overall only if ≥2 of 3 checks fail
 * (prevents over-rejection in edge cases like high-contrast night skies).
 *
 * Night mode exception: if `isNightSky` is true and luminance variance is
 * low (expected for very dark skies), skip the luminance check and rely
 * on motion alone.
 */
export async function runAntiSpoofChecks(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  motionSamples: MotionSample[],
  isNightSky: boolean,
  isBGRA = false,
): Promise<AntiSpoofResult> {
  const moireDetected = detectMoirePattern(buffer, width, height, isBGRA);
  const luminanceVariancePassed = isNightSky
    ? true // skip for dark night images — low variance is expected
    : checkLuminanceVariance(buffer, isBGRA);
  const motionLivenessPassed = checkMotionLiveness(motionSamples);

  const failCount = [moireDetected, !luminanceVariancePassed, !motionLivenessPassed].filter(
    Boolean,
  ).length;

  return {
    moireDetected,
    luminanceVariancePassed,
    motionLivenessPassed,
    overallPassed: failCount < 2,
  };
}
