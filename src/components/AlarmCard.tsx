import React from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import type { Alarm, DayOfWeek } from '../types/alarm';

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

const SHORT_LABELS: Record<DayOfWeek, string> = {
  0: 'S',
  1: 'M',
  2: 'T',
  3: 'W',
  4: 'T',
  5: 'F',
  6: 'S',
};

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

function dayLabel(days: DayOfWeek[]): string {
  if (days.length === 0) return 'Once';
  if (days.length === 7) return 'Every day';
  const weekdays: DayOfWeek[] = [1, 2, 3, 4, 5];
  const weekend: DayOfWeek[] = [0, 6];
  if (weekdays.every((d) => days.includes(d)) && days.length === 5) return 'Weekdays';
  if (weekend.every((d) => days.includes(d)) && days.length === 2) return 'Weekends';
  return days.map((d) => DAY_LABELS[d]).join(', ');
}

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: () => void;
  onPress: () => void;
  onDelete: () => void;
}

export function AlarmCard({ alarm, onToggle, onPress, onDelete }: AlarmCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.8}
      className={`rounded-2xl p-4 mb-3 ${
        alarm.isEnabled ? 'bg-white/10' : 'bg-white/5'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text
            className={`text-4xl font-bold tracking-tight ${
              alarm.isEnabled ? 'text-white' : 'text-white/40'
            }`}
          >
            {formatTime(alarm.hour, alarm.minute)}
          </Text>
          <Text className={`text-sm mt-0.5 ${alarm.isEnabled ? 'text-white/70' : 'text-white/30'}`}>
            {alarm.label || 'Alarm'}
          </Text>
          <View className="flex-row items-center mt-2 gap-2">
            <Text className={`text-xs ${alarm.isEnabled ? 'text-white/50' : 'text-white/25'}`}>
              {dayLabel(alarm.days)}
            </Text>
            {alarm.requireSkyVerification && (
              <View className="bg-sky-500/30 rounded-full px-2 py-0.5">
                <Text className="text-sky-300 text-xs">☀ Sky</Text>
              </View>
            )}
          </View>
        </View>
        <Switch
          value={alarm.isEnabled}
          onValueChange={onToggle}
          trackColor={{ false: '#374151', true: '#3b82f6' }}
          thumbColor="white"
        />
      </View>

      {/* Day pills */}
      {alarm.days.length > 0 && alarm.days.length < 7 && (
        <View className="flex-row mt-3 gap-1">
          {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((d) => (
            <View
              key={d}
              className={`w-8 h-8 rounded-full items-center justify-center ${
                alarm.days.includes(d)
                  ? alarm.isEnabled
                    ? 'bg-blue-500'
                    : 'bg-blue-500/40'
                  : 'bg-white/10'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  alarm.days.includes(d) ? 'text-white' : 'text-white/30'
                }`}
              >
                {SHORT_LABELS[d]}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
