import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlarmCard } from '../components/AlarmCard';
import { useAlarmList } from '../lib/hooks/useAlarmList';
import type { Alarm } from '../types/alarm';

export function HomeScreen() {
  const { alarms, isLoading, toggleAlarm, deleteAlarm } = useAlarmList();

  const handleDelete = (alarm: Alarm) => {
    Alert.alert('Delete Alarm', `Delete "${alarm.label || 'Alarm'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteAlarm(alarm.id),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-night">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <View>
          <Text className="text-white text-3xl font-bold tracking-tight">SkyRise</Text>
          <Text className="text-white/40 text-sm">Wake up to the sky</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
        >
          <Text className="text-white text-lg">⚙</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="white" />
        </View>
      ) : alarms.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl mb-4">🌤</Text>
          <Text className="text-white text-xl font-semibold text-center">No alarms yet</Text>
          <Text className="text-white/50 text-sm text-center mt-2">
            Set an alarm and the sky will keep you accountable every morning.
          </Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <AlarmCard
              alarm={item}
              onToggle={() => toggleAlarm(item.id)}
              onPress={() => router.push({ pathname: '/set-alarm', params: { alarmId: item.id } })}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/set-alarm')}
        className="absolute bottom-8 right-6 w-16 h-16 bg-blue-500 rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 8 }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
