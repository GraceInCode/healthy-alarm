import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ConfidenceBar } from '../components/ConfidenceBar';
import type { SkyDetectionResult, LayerResult } from '../types/skyResult';
import { setSkyVerified } from './AlarmFiringScreen';
import { stopAlarmAudio } from '../lib/alarm/alarmManager';

const LAYER_LABELS: Record<LayerResult['layer'], string> = {
  tflite: 'AI Segmentation',
  hsv: 'Colour Analysis',
  night: 'Night Mode',
  fallback: 'Motion Fallback',
};

const LAYER_ICONS: Record<LayerResult['layer'], string> = {
  tflite: '🤖',
  hsv: '🎨',
  night: '🌙',
  fallback: '🏃',
};

function spoofMessage(result: SkyDetectionResult): string | null {
  if (result.antiSpoof.overallPassed) return null;
  if (result.antiSpoof.moireDetected) {
    return 'This looks like a photo of a screen. Point the camera at the real sky.';
  }
  if (!result.antiSpoof.luminanceVariancePassed) {
    return 'The image looks like a printed photo. Please photograph real sky.';
  }
  if (!result.antiSpoof.motionLivenessPassed) {
    return 'No movement detected. Hold and slightly move your phone while photographing the sky.';
  }
  return 'Could not verify this is a live sky photo. Please try again.';
}

export function VerificationResultScreen() {
  const { result: resultStr, alarmId } = useLocalSearchParams<{
    result: string;
    alarmId: string;
  }>();

  const result: SkyDetectionResult = JSON.parse(resultStr ?? '{}');

  const handleDismiss = async () => {
    await stopAlarmAudio();
    setSkyVerified(true);
    router.replace('/');
  };

  const handleRetry = () => {
    router.replace({ pathname: '/sky-camera', params: { alarmId } });
  };

  const spoof = spoofMessage(result);

  return (
    <SafeAreaView className="flex-1 bg-sky-night">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {/* Result icon */}
        <View className="items-center py-8">
          <Text style={{ fontSize: 72 }}>{result.verified ? '✅' : '❌'}</Text>
          <Text className="text-white text-2xl font-bold mt-4">
            {result.verified ? 'Sky Verified!' : 'Verification Failed'}
          </Text>
          {result.verified && (
            <Text className="text-white/50 text-sm mt-1 text-center">
              Great start to the day ☀
            </Text>
          )}
        </View>

        {/* Overall confidence */}
        <View className="bg-white/10 rounded-2xl p-4 mb-4">
          <Text className="text-white/70 text-sm mb-3 font-medium">Overall Confidence</Text>
          <ConfidenceBar value={result.overallConfidence} animated />
        </View>

        {/* Anti-spoof failure */}
        {!result.antiSpoof.overallPassed && (
          <View className="bg-orange-500/15 border border-orange-500/30 rounded-2xl p-4 mb-4">
            <Text className="text-orange-400 font-semibold mb-1">⚠ Security Check</Text>
            <Text className="text-orange-300/80 text-sm">{spoof}</Text>
          </View>
        )}

        {/* Layer breakdown */}
        <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">
          Detection Layers
        </Text>
        {result.layerResults?.map((layer) => (
          <View key={layer.layer} className="bg-white/10 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-semibold">
                {LAYER_ICONS[layer.layer]} {LAYER_LABELS[layer.layer]}
              </Text>
              <View
                className={`px-2 py-0.5 rounded-full ${
                  layer.passed ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    layer.passed ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {layer.passed ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            </View>
            <ConfidenceBar value={layer.confidence} animated />
            <Text className="text-white/40 text-xs mt-2">{layer.details}</Text>
          </View>
        ))}

        {/* Anti-spoof details */}
        <View className="bg-white/10 rounded-2xl p-4 mb-6">
          <Text className="text-white font-semibold mb-3">🛡 Anti-Spoof Checks</Text>
          {[
            {
              label: 'No screen replay (Moiré)',
              passed: !result.antiSpoof.moireDetected,
            },
            {
              label: 'Natural image variance',
              passed: result.antiSpoof.luminanceVariancePassed,
            },
            {
              label: 'Phone movement (liveness)',
              passed: result.antiSpoof.motionLivenessPassed,
            },
          ].map(({ label, passed }) => (
            <View key={label} className="flex-row items-center justify-between py-1.5">
              <Text className="text-white/70 text-sm">{label}</Text>
              <Text className={passed ? 'text-green-400' : 'text-red-400'}>
                {passed ? '✓' : '✗'}
              </Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        {result.verified ? (
          <TouchableOpacity
            onPress={handleDismiss}
            className="bg-green-500 rounded-2xl py-5 items-center"
          >
            <Text className="text-white text-xl font-bold">Dismiss Alarm</Text>
          </TouchableOpacity>
        ) : (
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleRetry}
              className="bg-blue-500 rounded-2xl py-5 items-center"
            >
              <Text className="text-white text-lg font-bold">Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.replace({ pathname: '/alarm-firing', params: { alarmId } })
              }
              className="bg-white/10 rounded-2xl py-4 items-center"
            >
              <Text className="text-white/60 text-base">Back to Alarm</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
