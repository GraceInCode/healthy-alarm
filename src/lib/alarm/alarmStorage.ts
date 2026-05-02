import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alarm, AlarmConfig } from '../../types/alarm';
import { DEFAULT_ALARM_CONFIG } from '../../types/alarm';

const ALARMS_KEY = '@skyrise/alarms';
const CONFIG_KEY = '@skyrise/config';

function generateId(): string {
  return `alarm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function migrateAlarm(raw: Partial<Alarm>): Alarm {
  return {
    id: raw.id ?? generateId(),
    label: raw.label ?? 'Alarm',
    hour: raw.hour ?? 7,
    minute: raw.minute ?? 0,
    days: raw.days ?? [],
    isEnabled: raw.isEnabled ?? true,
    requireSkyVerification: raw.requireSkyVerification ?? true,
    snoozeCount: raw.snoozeCount ?? 0,
    createdAt: raw.createdAt ?? Date.now(),
    lastFiredAt: raw.lastFiredAt,
    lastVerifiedAt: raw.lastVerifiedAt,
    streakDays: raw.streakDays ?? 0,
    notificationId: raw.notificationId,
  };
}

export async function loadAlarms(): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARMS_KEY);
    if (!raw) return [];
    const parsed: Partial<Alarm>[] = JSON.parse(raw);
    return parsed.map(migrateAlarm);
  } catch {
    return [];
  }
}

export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
}

export async function addAlarm(alarm: Omit<Alarm, 'id' | 'createdAt'>): Promise<Alarm> {
  const alarms = await loadAlarms();
  const newAlarm: Alarm = { ...alarm, id: generateId(), createdAt: Date.now() };
  await saveAlarms([...alarms, newAlarm]);
  return newAlarm;
}

export async function updateAlarm(id: string, patch: Partial<Alarm>): Promise<void> {
  const alarms = await loadAlarms();
  const updated = alarms.map((a) => (a.id === id ? { ...a, ...patch } : a));
  await saveAlarms(updated);
}

export async function deleteAlarm(id: string): Promise<void> {
  const alarms = await loadAlarms();
  await saveAlarms(alarms.filter((a) => a.id !== id));
}

export async function loadAlarmConfig(): Promise<AlarmConfig> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_ALARM_CONFIG };
    return { ...DEFAULT_ALARM_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_ALARM_CONFIG };
  }
}

export async function saveAlarmConfig(patch: Partial<AlarmConfig>): Promise<void> {
  const current = await loadAlarmConfig();
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...patch }));
}
