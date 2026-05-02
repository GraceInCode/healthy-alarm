export const DETECTION_THRESHOLDS = {
  tfliteSkyPixelRatio: {
    low: 0.20,
    medium: 0.30,
    high: 0.45,
  },
  hsvSkyPixelRatio: {
    low: 0.15,
    medium: 0.22,
    high: 0.35,
  },
  // mean luminance below which we route to the night path
  nightLuminanceThreshold: 60,
  // night path: minimum luminance variance to prove it's actual sky (not a lens cap)
  nightVarianceMin: 8,
  antiSpoof: {
    // normalized FFT mid-band energy ratio above which Moire is flagged
    moireFrequencyThreshold: 0.35,
    // luminance standard deviation — printed/screen photos are typically ~2–8
    luminanceVarianceMin: 12,
    // 2 seconds of motion collection; magnitude threshold in m/s²
    motionDurationMs: 2000,
    motionMagnitudeThreshold: 0.8,
  },
  fallbackMotionDurationMs: 5 * 60 * 1000,
  confidenceWeights: {
    tflite: 0.55,
    hsv: 0.30,
    night: 0.15,
  },
} as const;
