import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface SkyOverlayProps {
  confidence: number; // 0–1 live
  isVerified: boolean;
}

function Corner({
  top,
  left,
  right,
  bottom,
  color,
}: {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  color: string;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        width: 28,
        height: 28,
        borderColor: color,
        borderTopWidth: top !== undefined ? 3 : 0,
        borderLeftWidth: left !== undefined ? 3 : 0,
        borderRightWidth: right !== undefined ? 3 : 0,
        borderBottomWidth: bottom !== undefined ? 3 : 0,
      }}
    />
  );
}

export function SkyOverlay({ confidence, isVerified }: SkyOverlayProps) {
  const animatedColor = useSharedValue(confidence);
  const verifiedFlash = useSharedValue(0);

  useEffect(() => {
    animatedColor.value = withTiming(confidence, { duration: 400 });
  }, [confidence]);

  useEffect(() => {
    if (isVerified) {
      verifiedFlash.value = withRepeat(withTiming(1, { duration: 200 }), 3, true);
    }
  }, [isVerified]);

  const overlayStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      animatedColor.value,
      [0, 0.4, 0.7, 1],
      ['rgba(255,255,255,0.2)', 'rgba(251,191,36,0.5)', 'rgba(34,197,94,0.6)', 'rgba(34,197,94,0.9)'],
    );
    return { borderColor };
  });

  const flashStyle = useAnimatedStyle(() => ({
    opacity: verifiedFlash.value * 0.25,
  }));

  const INSET = 40;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Rule-of-thirds grid */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderColor: 'rgba(255,255,255,0.08)', borderWidth: 0 },
        ]}
      >
        {[0.333, 0.666].map((frac) => (
          <React.Fragment key={frac}>
            <View
              style={{
                position: 'absolute',
                left: `${frac * 100}%`,
                top: 0,
                bottom: 0,
                width: StyleSheet.hairlineWidth,
                backgroundColor: 'rgba(255,255,255,0.12)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: `${frac * 100}%`,
                left: 0,
                right: 0,
                height: StyleSheet.hairlineWidth,
                backgroundColor: 'rgba(255,255,255,0.12)',
              }}
            />
          </React.Fragment>
        ))}
      </View>

      {/* Viewfinder corners */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: INSET,
            left: INSET,
            right: INSET,
            bottom: INSET,
          },
          overlayStyle,
        ]}
      >
        <Corner top={0} left={0} color="white" />
        <Corner top={0} right={0} color="white" />
        <Corner bottom={0} left={0} color="white" />
        <Corner bottom={0} right={0} color="white" />
      </Animated.View>

      {/* Verified green flash */}
      {isVerified && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#22c55e' },
            flashStyle,
          ]}
        />
      )}
    </View>
  );
}
