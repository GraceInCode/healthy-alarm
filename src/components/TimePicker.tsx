import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowAndroidPicker(false);
    if (selected) onChange(selected);
  };

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  if (Platform.OS === 'android') {
    return (
      <View>
        <TouchableOpacity
          onPress={() => setShowAndroidPicker(true)}
          className="bg-white/10 rounded-2xl px-8 py-4 items-center"
        >
          <Text className="text-white text-5xl font-bold tracking-tight">
            {formatTime(value)}
          </Text>
          <Text className="text-white/50 text-xs mt-1">Tap to change</Text>
        </TouchableOpacity>
        {showAndroidPicker && (
          <DateTimePicker
            value={value}
            mode="time"
            display="clock"
            onChange={handleChange}
          />
        )}
      </View>
    );
  }

  // iOS: inline spinner
  return (
    <DateTimePicker
      value={value}
      mode="time"
      display="spinner"
      onChange={handleChange}
      textColor="white"
      style={{ height: 150 }}
    />
  );
}
