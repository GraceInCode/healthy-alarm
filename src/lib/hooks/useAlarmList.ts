import { useState, useEffect, useCallback } from 'react';
import type { Alarm } from '../../types/alarm';
import {
  loadAlarms,
  addAlarm as storageAdd,
  updateAlarm as storageUpdate,
  deleteAlarm as storageDelete,
} from '../alarm/alarmStorage';
import {
  scheduleAlarm,
  cancelAlarmNotification,
  rescheduleAllAlarms,
} from '../alarm/alarmManager';

export function useAlarmList() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const loaded = await loadAlarms();
    setAlarms(loaded);
    return loaded;
  }, []);

  useEffect(() => {
    reload().then((loaded) => {
      rescheduleAllAlarms(loaded).catch(console.warn);
      setIsLoading(false);
    });
  }, [reload]);

  const addAlarm = useCallback(
    async (alarm: Omit<Alarm, 'id' | 'createdAt'>) => {
      const newAlarm = await storageAdd(alarm);
      if (newAlarm.isEnabled) {
        const notifId = await scheduleAlarm(newAlarm);
        if (notifId) await storageUpdate(newAlarm.id, { notificationId: notifId });
      }
      await reload();
    },
    [reload],
  );

  const updateAlarm = useCallback(
    async (id: string, patch: Partial<Alarm>) => {
      await storageUpdate(id, patch);
      const updated = await loadAlarms();
      const alarm = updated.find((a) => a.id === id);
      if (alarm) {
        if (alarm.notificationId) await cancelAlarmNotification(alarm.notificationId);
        if (alarm.isEnabled) {
          const notifId = await scheduleAlarm(alarm);
          if (notifId) await storageUpdate(id, { notificationId: notifId });
        }
      }
      await reload();
    },
    [reload],
  );

  const deleteAlarm = useCallback(
    async (id: string) => {
      const alarm = alarms.find((a) => a.id === id);
      if (alarm?.notificationId) await cancelAlarmNotification(alarm.notificationId);
      await storageDelete(id);
      await reload();
    },
    [alarms, reload],
  );

  const toggleAlarm = useCallback(
    async (id: string) => {
      const alarm = alarms.find((a) => a.id === id);
      if (!alarm) return;
      await updateAlarm(id, { isEnabled: !alarm.isEnabled });
    },
    [alarms, updateAlarm],
  );

  return { alarms, isLoading, addAlarm, updateAlarm, deleteAlarm, toggleAlarm };
}
