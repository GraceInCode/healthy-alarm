import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { TimePicker } from '../components/TimePicker';
import { useAlarmList } from '../lib/hooks/useAlarmList';
import type { DayOfWeek } from '../types/alarm';

const DAYS: { key: DayOfWeek; short: string; long: string }[] = [
  { key: 0, short: 'S', long: 'Sun' },
  { key: 1, short: 'M', long: 'Mon' },
  { key: 2, short: 'T', long: 'Tue' },
  { key: 3, short: 'W', long: 'Wed' },
  { key: 4, short: 'T', long: 'Thu' },
  { key: 5, short: 'F', long: 'Fri' },
  { key: 6, short: 'S', long: 'Sat' },
];

export function SetAlarmScreen() {
  const { alarmId } = useLocalSearchParams<{ alarmId?: string }>();
  const { alarms, addAlarm, updateAlarm } = useAlarmList();

  const existing = alarmId ? alarms.find((a) => a.id === alarmId) : undefined;

  const [time, setTime] = useState<Date>(() => {
    if (existing) {
      const d = new Date();
      d.setHours(existing.hour, existing.minute, 0, 0);
      return d;
    }
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [label, setLabel] = useState(existing?.label ?? '');
  const [days, setDays] = useState<DayOfWeek[]>(existing?.days ?? []);
  const [requireSky, setRequireSky] = useState(existing?.requireSkyVerification ?? true);

  useEffect(() => {
    if (existing && alarms.length > 0) {
      const d = new Date();
      d.setHours(existing.hour, existing.minute, 0, 0);
      setTime(d);
      setLabel(existing.label);
      setDays(existing.days);
      setRequireSky(existing.requireSkyVerification);
    }
  }, [alarmId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const handleSave = async () => {
    const alarmData = {
      label: label.trim() || 'Alarm',
      hour: time.getHours(),
      minute: time.getMinutes(),
      days,
      isEnabled: true,
      requireSkyVerification: requireSky,
      snoozeCount: 0,
    };

    try {
      if (existing) {
        await updateAlarm(existing.id, alarmData);
      } else {
        await addAlarm(alarmData);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save alarm. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-night">
      {/* Nav */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Text className="text-blue-400 text-base">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold text-lg">
          {existing ? 'Edit Alarm' : 'New Alarm'}
        </Text>
        <TouchableOpacity onPress={handleSave} className="p-2">
          <Text className="text-blue-400 font-semibold text-base">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Time Picker */}
        <View className="items-center py-4">
          <TimePicker value={time} onChange={setTime} />
        </View>

        {/* Label */}
        <View className="bg-white/10 rounded-2xl px-4 py-3 mb-4">
          <Text className="text-white/50 text-xs uppercase tracking-wider mb-1">Label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Alarm"
            placeholderTextColor="rgba(255,255,255,0.3)"
            className="text-white text-base"
            maxLength={40}
          />
        </View>

        {/* Days */}
        <View className="bg-white/10 rounded-2xl px-4 py-4 mb-4">
          <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">Repeat</Text>
          <View className="flex-row justify-between">
            {DAYS.map(({ key, short, long }) => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleDay(key)}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  days.includes(key) ? 'bg-blue-500' : 'bg-white/10'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    days.includes(key) ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-white/30 text-xs mt-2 text-center">
            {days.length === 0 ? 'One-time alarm' : days.map((d) => DAYS[d].long).join(', ')}
          </Text>
        </View>

        {/* Sky Verification Toggle */}
        <View className="bg-white/10 rounded-2xl px-4 py-4 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-white font-semibold text-base">☀ Sky Verification</Text>
              <Text className="text-white/50 text-sm mt-0.5">
                Alarm won't stop until you photograph real sky
              </Text>
            </View>
            <Switch
              value={requireSky}
              onValueChange={setRequireSky}
              trackColor={{ false: '#374151', true: '#3b82f6' }}
              thumbColor="white"
            />
          </View>
        </View>

        {!requireSky && (
          <View className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-4">
            <Text className="text-yellow-400 text-sm">
              ⚠ Without sky verification, this is just a standard alarm. Enable it for the full
              circadian rhythm benefit.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
