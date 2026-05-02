import { DETECTION_THRESHOLDS } from '../../constants/detectionThresholds';
import type { SkyDetectionResult, MotionSample, LayerResult } from '../../types/skyResult';
import type { AlarmConfig } from '../../types/alarm';
import { analyzeHsvSkyRatio, buildHsvLayerResult } from './hsvAnalyzer';
import { analyzeNightSky, buildNightLayerResult } from './nightDetector';
import { runAntiSpoofChecks } from './antiSpoof';
import { runDeeplabInference, buildTfliteLayerResult } from './tfliteDetector';
import type { TfliteModel } from 'react-native-fast-tflite';

export interface FrameData {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  /** true if bytes are BGRA order (typical iOS); false = RGBA */
  isBGRA: boolean;
}

/**
 * Full sky detection pipeline.
 *
 * Routing logic:
 * - Dark scene (mean luminance < threshold) → night path
 * - Bright scene → TFLite (if model loaded) + HSV in parallel
 *
 * Anti-spoof gate always runs and can veto the result.
 */
export async function verifySkyPhoto(
  frame: FrameData,
  motionSamples: MotionSample[],
  sensitivity: AlarmConfig['detectionSensitivity'],
  tfliteModel: TfliteModel | undefined,
): Promise<SkyDetectionResult> {
  const { buffer, width, height, isBGRA } = frame;
  const layerResults: LayerResult[] = [];

  // ── 1. Determine scene brightness ──────────────────────────────────────
  const nightResult = analyzeNightSky(buffer, width, height, isBGRA);
  const isNightScene = nightResult.meanLuminance <= DETECTION_THRESHOLDS.nightLuminanceThreshold;

  // ── 2. Anti-spoof (runs concurrently with detection) ───────────────────
  const antiSpoofPromise = runAntiSpoofChecks(
    buffer,
    width,
    height,
    motionSamples,
    isNightScene,
    isBGRA,
  );

  // ── 3. Detection layers ────────────────────────────────────────────────
  let finalConfidence = 0;
  let method: SkyDetectionResult['method'];

  if (isNightScene) {
    // Night path: variance + gradient analysis
    layerResults.push(buildNightLayerResult(nightResult));
    finalConfidence = nightResult.confidence;
    method = 'night';
  } else {
    // Standard path: TFLite + HSV
    const hsvResult = analyzeHsvSkyRatio(buffer, width, height, isBGRA);
    layerResults.push(buildHsvLayerResult(hsvResult, sensitivity));

    const { confidenceWeights } = DETECTION_THRESHOLDS;

    if (tfliteModel) {
      const tfliteResult = await runDeeplabInference(tfliteModel, buffer, width, height, isBGRA);
      layerResults.push(buildTfliteLayerResult(tfliteResult, sensitivity));
      finalConfidence =
        tfliteResult.confidence * confidenceWeights.tflite +
        hsvResult.confidence * confidenceWeights.hsv;
    } else {
      // TFLite not yet loaded — rely on HSV only with a slight penalty
      finalConfidence = hsvResult.confidence * 0.85;
    }
    method = tfliteModel ? 'tflite' : 'hsv';
  }

  // ── 4. Anti-spoof gate ─────────────────────────────────────────────────
  const antiSpoof = await antiSpoofPromise;

  const thresholdMap = {
    low: 0.25,
    medium: 0.40,
    high: 0.60,
  };
  const passThreshold = thresholdMap[sensitivity];
  const skyDetected = finalConfidence >= passThreshold;

  // Anti-spoof veto: if anti-spoof fails AND sky detection is marginal (< 0.7),
  // block. This avoids false negatives on legitimate but unusual sky photos.
  const antiSpoofVeto = !antiSpoof.overallPassed && finalConfidence < 0.7;
  const verified = skyDetected && !antiSpoofVeto;

  return {
    verified,
    overallConfidence: finalConfidence,
    layerResults,
    antiSpoof,
    method,
    capturedAt: Date.now(),
  };
}

/**
 * Lightweight live-preview confidence — runs HSV only (no TFLite).
 * Suitable for calling every 500ms from the camera screen.
 */
export function getLivePreviewConfidence(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  isBGRA: boolean,
): number {
  const result = analyzeHsvSkyRatio(buffer, width, height, isBGRA);
  return result.confidence;
}
