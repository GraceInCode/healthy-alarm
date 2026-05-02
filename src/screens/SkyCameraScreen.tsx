import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import {
  useCamera,
  usePreviewOutput,
  usePhotoOutput,
  useFrameOutput,
  NativePreviewView,
  useCameraDevice,
  VisionCamera,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { SkyOverlay } from '../components/SkyOverlay';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { useSkyVerification } from '../lib/hooks/useSkyVerification';
import { useShortMotionSamples } from '../lib/hooks/useMotionChallenge';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { getLivePreviewConfidence } from '../lib/skyDetection/detectionPipeline';
import { setSkyVerified } from './AlarmFiringScreen';
import type { FrameData } from '../lib/skyDetection/detectionPipeline';
import * as FileSystem from 'expo-file-system';

// TFLite model — loaded from URL; swap to require() once bundled locally
const MODEL_SOURCE = {
  url: 'https://storage.googleapis.com/download.tensorflow.org/models/tflite/deeplabv3_257_mv_gpu.tflite',
};

export function SkyCameraScreen() {
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const tfliteState = useTensorflowModel(MODEL_SOURCE, ['android-gpu']);
  const device = useCameraDevice('back');

  const previewOutput = usePreviewOutput();
  const photoOutput = usePhotoOutput({ enablePreviewSizedOutputBuffers: false } as any);

  const { samples: motionSamples, startCollecting } = useShortMotionSamples();
  const { storeLatestFrame, captureAndVerify, isProcessing } = useSkyVerification(
    'medium',
    tfliteState.state === 'loaded' ? tfliteState.model : undefined,
  );

  // Frame processor — live confidence at ~2fps to save battery
  const frameCounter = useRef(0);
  const frameOutput = useFrameOutput({
    enablePreviewSizedOutputBuffers: true,
    onFrame: useCallback(
      (frame: any) => {
        'worklet';
        frameCounter.current = (frameCounter.current + 1) % 30;
        if (frameCounter.current === 0) {
          // Every 30th frame (~1fps at 30fps camera) — lightweight HSV only
          try {
            if (frame.isPlanar) {
              frame.dispose();
              return;
            }
            const buf: ArrayBuffer = frame.getPixelBuffer();
            const confidence = getLivePreviewConfidence(
              buf,
              frame.width,
              frame.height,
              true, // iOS BGRA; adapt per platform if needed
            );
            // Store frame data for capture
            const frameData: FrameData = {
              buffer: buf,
              width: frame.width,
              height: frame.height,
              isBGRA: true,
            };
            runOnJS(setLiveConfidence)(confidence);
            runOnJS(storeLatestFrame)(frameData);
          } catch {}
          frame.dispose();
        } else {
          frame.dispose();
        }
      },
      [storeLatestFrame],
    ),
  } as any);

  const cameraController = useCamera({
    isActive: !isCapturing && !isVerified,
    device: device ?? 'back',
    outputs: [previewOutput, photoOutput, frameOutput],
  });

  // Request permission on mount
  React.useEffect(() => {
    VisionCamera.requestCameraPermission().then((granted) => {
      setHasPermission(granted);
      if (granted) startCollecting();
    });
  }, [startCollecting]);

  const handleCapture = async () => {
    if (isCapturing || isProcessing) return;
    setIsCapturing(true);

    try {
      const result = await captureAndVerify(motionSamples);
      if (!result) {
        Alert.alert('Error', 'Could not analyse the photo. Please try again.');
        setIsCapturing(false);
        return;
      }

      if (result.verified) {
        setIsVerified(true);
        setSkyVerified(true);
        // Brief pause so the user sees the green overlay
        setTimeout(() => {
          router.replace({
            pathname: '/verification-result',
            params: { result: JSON.stringify(result), alarmId: alarmId ?? '' },
          });
        }, 800);
      } else {
        router.replace({
          pathname: '/verification-result',
          params: { result: JSON.stringify(result), alarmId: alarmId ?? '' },
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Detection failed. Please try again.');
      setIsCapturing(false);
    }
  };

  if (hasPermission === false) {
    return (
      <View className="flex-1 bg-sky-night items-center justify-center px-8">
        <Text className="text-white text-xl font-semibold text-center mb-3">
          Camera Permission Required
        </Text>
        <Text className="text-white/60 text-sm text-center">
          SkyRise needs camera access to verify the sky. Please enable it in Settings.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera Preview */}
      {device && (
        <NativePreviewView
          previewOutput={previewOutput}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
      )}

      {/* Overlay */}
      <SkyOverlay confidence={liveConfidence} isVerified={isVerified} />

      {/* Top bar */}
      <View className="absolute top-0 left-0 right-0 pt-12 px-5 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-black/40 rounded-full w-10 h-10 items-center justify-center"
        >
          <Text className="text-white text-lg">✕</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold text-base ml-3">Point at the sky</Text>
        {tfliteState.state === 'loading' && (
          <View className="ml-auto flex-row items-center gap-1">
            <ActivityIndicator size="small" color="white" />
            <Text className="text-white/60 text-xs">Loading AI model…</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View className="absolute bottom-0 left-0 right-0 pb-12 px-6">
        {/* Live confidence bar */}
        <View className="bg-black/50 rounded-2xl px-4 py-3 mb-6 backdrop-blur">
          <ConfidenceBar value={liveConfidence} label="Sky detected" />
          <Text className="text-white/50 text-xs mt-2 text-center">
            Works for clear, cloudy, foggy and night sky
          </Text>
        </View>

        {/* Capture button */}
        <View className="items-center">
          <TouchableOpacity
            onPress={handleCapture}
            disabled={isCapturing || isProcessing}
            className={`w-20 h-20 rounded-full border-4 border-white items-center justify-center ${
              isCapturing || isProcessing ? 'opacity-50' : ''
            }`}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {isCapturing || isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="w-14 h-14 rounded-full bg-white" />
            )}
          </TouchableOpacity>
          <Text className="text-white/60 text-xs mt-2">
            {isProcessing ? 'Analysing…' : 'Tap to verify'}
          </Text>
        </View>
      </View>
    </View>
  );
}
