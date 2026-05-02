export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Alarm {
  id: string;
  label: string;
  hour: number;
  minute: number;
  days: DayOfWeek[];
  isEnabled: boolean;
  requireSkyVerification: boolean;
  snoozeCount: number;
  createdAt: number;
  lastFiredAt?: number;
  lastVerifiedAt?: number;
  streakDays?: number;
  notificationId?: string;
}

export interface AlarmConfig {
  fallbackEnabled: boolean;
  detectionSensitivity: 'low' | 'medium' | 'high';
  snoozeLimit: number;
}

export const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  fallbackEnabled: true,
  detectionSensitivity: 'medium',
  snoozeLimit: 3,
};
