import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { loadAlarmConfig, saveAlarmConfig } from '../lib/alarm/alarmStorage';
import type { AlarmConfig } from '../types/alarm';

const SENSITIVITY_OPTIONS: { value: AlarmConfig['detectionSensitivity']; label: string; desc: string }[] = [
  { value: 'low', label: 'Lenient', desc: 'Easier to pass, accepts partial sky views' },
  { value: 'medium', label: 'Balanced', desc: 'Recommended — fair for all sky conditions' },
  { value: 'high', label: 'Strict', desc: 'Sky must fill most of the frame' },
];

export function SettingsScreen() {
  const [config, setConfig] = useState<AlarmConfig | null>(null);

  useEffect(() => {
    loadAlarmConfig().then(setConfig);
  }, []);

  const update = async (patch: Partial<AlarmConfig>) => {
    const updated = { ...config!, ...patch };
    setConfig(updated);
    await saveAlarmConfig(patch);
  };

  if (!config) return null;

  return (
    <SafeAreaView className="flex-1 bg-sky-night">
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 mr-2">
          <Text className="text-blue-400 text-base">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold text-lg">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Detection Sensitivity */}
        <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">
          Sky Detection Sensitivity
        </Text>
        <View className="bg-white/10 rounded-2xl overflow-hidden mb-6">
          {SENSITIVITY_OPTIONS.map(({ value, label, desc }, idx) => (
            <TouchableOpacity
              key={value}
              onPress={() => update({ detectionSensitivity: value })}
              className={`flex-row items-center p-4 ${idx > 0 ? 'border-t border-white/10' : ''}`}
            >
              <View className="flex-1">
                <Text className="text-white font-medium">{label}</Text>
                <Text className="text-white/50 text-xs mt-0.5">{desc}</Text>
              </View>
              {config.detectionSensitivity === value && (
                <Text className="text-blue-400 text-lg">✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Fallback Override */}
        <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">
          Fallback
        </Text>
        <View className="bg-white/10 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-white font-medium">Allow Motion Fallback</Text>
              <Text className="text-white/50 text-xs mt-0.5">
                5 minutes of phone movement if camera is blocked or sky is pitch black
              </Text>
            </View>
            <Switch
              value={config.fallbackEnabled}
              onValueChange={(v) => update({ fallbackEnabled: v })}
              trackColor={{ false: '#374151', true: '#3b82f6' }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Snooze Limit */}
        <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">Snooze</Text>
        <View className="bg-white/10 rounded-2xl overflow-hidden mb-6">
          {[1, 2, 3, 5].map((n, idx) => (
            <TouchableOpacity
              key={n}
              onPress={() => update({ snoozeLimit: n })}
              className={`flex-row items-center justify-between p-4 ${
                idx > 0 ? 'border-t border-white/10' : ''
              }`}
            >
              <Text className="text-white">{n === 1 ? '1 snooze' : `${n} snoozes`}</Text>
              {config.snoozeLimit === n && <Text className="text-blue-400">✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Phase 2 stubs */}
        <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">Coming Soon</Text>
        <View className="bg-white/5 rounded-2xl overflow-hidden mb-6 opacity-50">
          {[
            { icon: '🔥', label: 'Streak Tracker', desc: 'Track your consecutive wake-up days' },
            { icon: '📸', label: 'Sky Journal', desc: 'Review a photo diary of your mornings' },
            { icon: '🌅', label: 'Adaptive Sunrise', desc: 'Alarm adjusts to your local sunrise time' },
            { icon: '❤', label: 'Health Sync', desc: 'Export wake-up data to Apple Health / Google Fit' },
          ].map(({ icon, label, desc }, idx) => (
            <View
              key={label}
              className={`flex-row items-center p-4 ${idx > 0 ? 'border-t border-white/10' : ''}`}
            >
              <Text className="text-2xl mr-3">{icon}</Text>
              <View>
                <Text className="text-white/60 font-medium">{label}</Text>
                <Text className="text-white/30 text-xs">{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* About */}
        <View className="items-center mt-4">
          <Text className="text-white/20 text-xs">SkyRise Alarm v1.0.0</Text>
          <Text className="text-white/15 text-xs mt-1">
            Morning light regulates your circadian rhythm
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
