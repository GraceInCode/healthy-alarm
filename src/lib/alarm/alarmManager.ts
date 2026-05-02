import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds, isPast, nextDay } from 'date-fns';
import type { Alarm } from '../../types/alarm';
import { updateAlarm } from './alarmStorage';

const ALARM_TASK_NAME = 'SKYRISE_ALARM_TASK';

// Keep a reference to the active Sound so AlarmFiringScreen can stop it
let activeSound: Audio.Sound | null = null;

// ── Background task registration (module-level, runs at import time) ──────────

TaskManager.defineTask(ALARM_TASK_NAME, async ({ data, error }: any) => {
  if (error) return;
  // The notification data contains the alarmId
  // Navigation to AlarmFiringScreen is handled by the notification response listener
  // set up in _layout.tsx
});

// ── Notification setup ────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false, // We play our own sound
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// ── Audio ─────────────────────────────────────────────────────────────────────

export async function startAlarmAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
    });
    if (activeSound) {
      await stopAlarmAudio();
    }
    const { sound } = await Audio.Sound.createAsync(
      require('../../../assets/audio/alarm.wav'),
      { shouldPlay: true, isLooping: true, volume: 1.0 },
    );
    activeSound = sound;
  } catch (e) {
    console.warn('[AlarmManager] Audio failed:', e);
  }
}

export async function stopAlarmAudio(): Promise<void> {
  if (!activeSound) return;
  try {
    await activeSound.stopAsync();
    await activeSound.unloadAsync();
  } catch {}
  activeSound = null;
}

// ── Scheduling ────────────────────────────────────────────────────────────────

function nextOccurrence(alarm: Alarm): Date {
  const now = new Date();
  let candidate = setMilliseconds(setSeconds(setMinutes(setHours(now, alarm.hour), alarm.minute), 0), 0);

  if (alarm.days.length === 0) {
    // One-time alarm
    if (isPast(candidate)) {
      candidate = addDays(candidate, 1);
    }
    return candidate;
  }

  // Repeating alarm — find the next matching weekday
  for (let offset = 0; offset <= 7; offset++) {
    const check = addDays(candidate, offset);
    if (alarm.days.includes(check.getDay() as Alarm['days'][number]) && !isPast(check)) {
      return check;
    }
  }
  return addDays(candidate, 1); // fallback
}

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
      allowCriticalAlerts: true,
    },
  });
  return status === 'granted';
}

export async function scheduleAlarm(alarm: Alarm): Promise<string | undefined> {
  try {
    const trigger = nextOccurrence(alarm);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label || 'SkyRise Alarm',
        body: 'Tap to dismiss with a sky photo',
        sound: false, // custom audio handled by the app
        data: { alarmId: alarm.id, type: 'ALARM_FIRE' },
        priority: 'max' as const,
        sticky: true,
      } as any,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
    return id;
  } catch (e) {
    console.warn('[AlarmManager] scheduleAlarm error:', e);
    return undefined;
  }
}

export async function cancelAlarmNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

export async function rescheduleAllAlarms(alarms: Alarm[]): Promise<void> {
  for (const alarm of alarms) {
    if (!alarm.isEnabled) continue;
    const id = await scheduleAlarm(alarm);
    if (id && id !== alarm.notificationId) {
      await updateAlarm(alarm.id, { notificationId: id });
    }
  }
}
