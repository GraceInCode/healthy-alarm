import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Vibration, AppState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { loadAlarms, updateAlarm } from '../lib/alarm/alarmStorage';
import { startAlarmAudio, stopAlarmAudio } from '../lib/alarm/alarmManager';
import type { Alarm } from '../types/alarm';

// Global flag so SkyCameraScreen can signal back a verified result
let pendingVerification = false;
export function setSkyVerified(verified: boolean) {
  pendingVerification = verified;
}

export function AlarmFiringScreen() {
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [skyVerified, setSkyVerifiedState] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);

  const pulseScale = useSharedValue(1);
  const verifiedOpacity = useSharedValue(0);

  useEffect(() => {
    // Load alarm details
    loadAlarms().then((alarms) => {
      const found = alarms.find((a) => a.id === alarmId);
      setAlarm(found ?? null);
    });

    // Start audio + vibration
    startAlarmAudio().catch(console.warn);
    const vibInterval = setInterval(() => Vibration.vibrate([0, 500, 200, 500]), 2000);

    // Pulse animation
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      false,
    );

    // Clock tick
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(vibInterval);
      clearInterval(clockInterval);
      Vibration.cancel();
    };
  }, [alarmId]);

  // Poll for verification result from SkyCameraScreen
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pendingVerification) {
        pendingVerification = false;
        handleVerified();
      }
    });
    return () => appStateSub.remove();
  }, []);

  const handleVerified = () => {
    setSkyVerifiedState(true);
    stopAlarmAudio();
    Vibration.cancel();
    verifiedOpacity.value = withTiming(1, { duration: 300 });
    // Update alarm record
    if (alarmId) updateAlarm(alarmId, { lastVerifiedAt: Date.now(), snoozeCount: 0 });
  };

  const handleDismiss = () => {
    router.replace('/');
  };

  const handleSnooze = () => {
    if (!alarm) return;
    const newSnoozeCount = (alarm.snoozeCount ?? 0) + 1;
    updateAlarm(alarm.id, { snoozeCount: newSnoozeCount });
    stopAlarmAudio();
    Vibration.cancel();
    router.replace('/');
  };

  const handleOpenCamera = () => {
    setShowSnooze(true); // show snooze option after first attempt
    router.push({ pathname: '/sky-camera', params: { alarmId: alarmId ?? '' } });
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const dismissOverlayStyle = useAnimatedStyle(() => ({
    opacity: verifiedOpacity.value,
  }));

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <View className="flex-1 bg-sky-night items-center justify-between py-16 px-6">
      {/* Verified green overlay */}
      <Animated.View
        style={[
          { position: 'absolute', inset: 0, backgroundColor: '#16a34a', zIndex: 0 },
          dismissOverlayStyle,
        ]}
        pointerEvents="none"
      />

      {/* Time */}
      <View className="items-center" style={{ zIndex: 1 }}>
        <Text className="text-white/50 text-lg uppercase tracking-widest">
          {alarm?.label || 'Alarm'}
        </Text>
        <Text className="text-white text-7xl font-bold tracking-tight mt-2">
          {formatTime(currentTime)}
        </Text>
      </View>

      {/* Alarm icon */}
      <Animated.View style={[{ alignItems: 'center' }, iconStyle]}>
        <Text style={{ fontSize: 96 }}>🔔</Text>
      </Animated.View>

      {/* Actions */}
      <View className="w-full gap-4" style={{ zIndex: 1 }}>
        {skyVerified ? (
          <TouchableOpacity
            onPress={handleDismiss}
            className="bg-green-500 rounded-2xl py-5 items-center"
          >
            <Text className="text-white text-xl font-bold">✓ Alarm Dismissed</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleOpenCamera}
              className="bg-blue-500 rounded-2xl py-5 items-center"
            >
              <Text className="text-white text-xl font-bold">📷 Show the Sky</Text>
              <Text className="text-white/70 text-sm mt-1">Point at any sky to stop this alarm</Text>
            </TouchableOpacity>

            {showSnooze && (
              <TouchableOpacity
                onPress={handleSnooze}
                className="bg-white/10 rounded-2xl py-4 items-center"
              >
                <Text className="text-white/60 text-base">Snooze 5 min</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}
