import '../global.css';
// Side-effect import: registers the background alarm task at module load time
import '../src/lib/alarm/alarmManager';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { requestPermissions } from '../src/lib/alarm/alarmManager';

export default function RootLayout() {
  useEffect(() => {
    // Request notification permissions on first launch
    requestPermissions().catch(console.warn);

    // Handle alarm notification tap — navigate to AlarmFiringScreen
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === 'ALARM_FIRE' && data?.alarmId) {
        router.replace({
          pathname: '/alarm-firing',
          params: { alarmId: data.alarmId },
        });
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a1a' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="set-alarm"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="alarm-firing"
          options={{
            presentation: 'fullScreenModal',
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen name="sky-camera" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="verification-result" options={{ animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}
