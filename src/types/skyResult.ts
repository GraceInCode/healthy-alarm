export type DetectionLayer = 'tflite' | 'hsv' | 'night' | 'fallback';

export interface LayerResult {
  layer: DetectionLayer;
  passed: boolean;
  confidence: number;
  details: string;
}

export interface AntiSpoofResult {
  moireDetected: boolean;
  luminanceVariancePassed: boolean;
  motionLivenessPassed: boolean;
  overallPassed: boolean;
}

export interface SkyDetectionResult {
  verified: boolean;
  overallConfidence: number;
  layerResults: LayerResult[];
  antiSpoof: AntiSpoofResult;
  method: DetectionLayer;
  capturedAt: number;
  imagePath?: string;
}

export interface MotionSample {
  ax: number;
  ay: number;
  az: number;
  timestamp: number;
}
