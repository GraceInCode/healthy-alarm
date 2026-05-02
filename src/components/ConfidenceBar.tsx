import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

interface ConfidenceBarProps {
  value: number; // 0–1
  label?: string;
  animated?: boolean;
}

export function ConfidenceBar({ value, label, animated = true }: ConfidenceBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withTiming(value, { duration: 300 });
    } else {
      progress.value = value;
    }
  }, [value, animated, progress]);

  const barStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      progress.value,
      [0, 0.4, 0.7, 1],
      ['#ef4444', '#f97316', '#eab308', '#22c55e'],
    );
    return {
      width: `${Math.round(progress.value * 100)}%`,
      backgroundColor: bgColor,
    };
  });

  const pct = Math.round(value * 100);

  return (
    <View className="w-full">
      {label && (
        <Text className="text-white/60 text-xs mb-1 font-medium uppercase tracking-wider">
          {label}
        </Text>
      )}
      <View className="h-3 bg-white/10 rounded-full overflow-hidden">
        <Animated.View style={[barStyle, { height: '100%', borderRadius: 999 }]} />
      </View>
      <Text className="text-white/70 text-xs mt-1 text-right">{pct}%</Text>
    </View>
  );
}
