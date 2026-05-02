import { useTensorflowModel, type TensorflowPlugin } from 'react-native-fast-tflite';
import { DETECTION_THRESHOLDS } from '../../constants/detectionThresholds';
import type { LayerResult } from '../../types/skyResult';

// Pascal VOC class index for "sky"
const SKY_CLASS_INDEX = 2;
// DeepLab v3+ input resolution
const MODEL_SIZE = 257;

export type TfliteDetectorState = TensorflowPlugin;

/**
 * Hook that loads the DeepLab v3+ TFLite model.
 * Returns the model state — pass `state.model` to `runDeeplabInference`.
 *
 * The model is loaded from TF Hub at runtime to avoid bundling 2.4 MB
 * in the initial download (change to require() once model is downloaded
 * to assets/models/).
 */
export function useSkyModel(): TfliteDetectorState {
  return useTensorflowModel(
    {
      // Download from TF Hub once; commit to assets/models/ for production
      url: 'https://tfhub.dev/tensorflow/lite-model/deeplabv3/1/metadata/2?lite-format=tflite',
    },
    ['android-gpu'], // falls back to CPU if GPU unavailable
  );
}

/**
 * Bilinearly downsample an RGBA/BGRA pixel buffer to `MODEL_SIZE × MODEL_SIZE`,
 * then normalise to float32 in range [0, 1] and return as a Float32Array.
 */
function prepareModelInput(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  isBGRA: boolean,
): Float32Array {
  const src = new Uint8Array(buffer);
  const out = new Float32Array(MODEL_SIZE * MODEL_SIZE * 3);

  const scaleX = width / MODEL_SIZE;
  const scaleY = height / MODEL_SIZE;

  for (let y = 0; y < MODEL_SIZE; y++) {
    for (let x = 0; x < MODEL_SIZE; x++) {
      const srcX = Math.min(Math.floor(x * scaleX), width - 1);
      const srcY = Math.min(Math.floor(y * scaleY), height - 1);
      const srcIdx = (srcY * width + srcX) * 4;

      const r = isBGRA ? src[srcIdx + 2] : src[srcIdx];
      const g = src[srcIdx + 1];
      const b = isBGRA ? src[srcIdx] : src[srcIdx + 2];

      const outIdx = (y * MODEL_SIZE + x) * 3;
      out[outIdx] = r / 255;
      out[outIdx + 1] = g / 255;
      out[outIdx + 2] = b / 255;
    }
  }

  return out;
}

export interface TfliteInferenceResult {
  skyRatio: number;
  confidence: number;
}

/**
 * Run DeepLab v3+ inference on a captured frame buffer.
 * Call only on the JS thread (not in a worklet) — TFLite inference is async-safe.
 */
export async function runDeeplabInference(
  model: NonNullable<TensorflowPlugin['model']>,
  buffer: ArrayBuffer,
  width: number,
  height: number,
  isBGRA: boolean,
): Promise<TfliteInferenceResult> {
  const input = prepareModelInput(buffer, width, height, isBGRA);
  const [outputBuffer] = await model.run([input.buffer as ArrayBuffer]);
  const labels = new Uint8Array(outputBuffer);

  const totalPixels = MODEL_SIZE * MODEL_SIZE;
  let skyPixels = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (labels[i] === SKY_CLASS_INDEX) skyPixels++;
  }

  const skyRatio = skyPixels / totalPixels;
  const confidence = Math.min(1, skyRatio / (DETECTION_THRESHOLDS.tfliteSkyPixelRatio.medium * 2));

  return { skyRatio, confidence };
}

export function buildTfliteLayerResult(
  result: TfliteInferenceResult,
  sensitivity: 'low' | 'medium' | 'high',
): LayerResult {
  const threshold = DETECTION_THRESHOLDS.tfliteSkyPixelRatio[sensitivity];
  const passed = result.skyRatio >= threshold;
  return {
    layer: 'tflite',
    passed,
    confidence: result.confidence,
    details: `DeepLab: ${(result.skyRatio * 100).toFixed(1)}% sky pixels; threshold ${(threshold * 100).toFixed(0)}%`,
  };
}
