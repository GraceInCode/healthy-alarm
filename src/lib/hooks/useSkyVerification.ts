import { useState, useRef, useCallback } from 'react';
import type { SkyDetectionResult, MotionSample } from '../../types/skyResult';
import type { AlarmConfig } from '../../types/alarm';
import { verifySkyPhoto, type FrameData } from '../skyDetection/detectionPipeline';
import type { TfliteModel } from 'react-native-fast-tflite';

export function useSkyVerification(
  sensitivity: AlarmConfig['detectionSensitivity'],
  tfliteModel: TfliteModel | undefined,
) {
  const [currentResult, setCurrentResult] = useState<SkyDetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveConfidence, setLiveConfidence] = useState(0);

  const latestFrameRef = useRef<FrameData | null>(null);

  const updateLiveConfidence = useCallback((confidence: number) => {
    setLiveConfidence(confidence);
  }, []);

  const storeLatestFrame = useCallback((frame: FrameData) => {
    latestFrameRef.current = frame;
  }, []);

  const captureAndVerify = useCallback(
    async (motionSamples: MotionSample[]): Promise<SkyDetectionResult | null> => {
      const frame = latestFrameRef.current;
      if (!frame) return null;

      setIsProcessing(true);
      try {
        const result = await verifySkyPhoto(frame, motionSamples, sensitivity, tfliteModel);
        setCurrentResult(result);
        return result;
      } catch (e) {
        console.warn('[SkyVerification] Pipeline error:', e);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [sensitivity, tfliteModel],
  );

  const reset = useCallback(() => {
    setCurrentResult(null);
    setLiveConfidence(0);
    latestFrameRef.current = null;
  }, []);

  return {
    captureAndVerify,
    storeLatestFrame,
    updateLiveConfidence,
    currentResult,
    liveConfidence,
    isProcessing,
    reset,
  };
}
