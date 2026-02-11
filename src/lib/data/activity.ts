import { db } from '../firebase';
import { ref, get, set, push } from 'firebase/database';
import type { ActivityLog } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';

export async function getActivities(storeId: string): Promise<ActivityLog[]> {
    const snapshot = await get(ref(db, `storeData/${storeId}/activityLogs`));
    const logs = snapshotToArray<ActivityLog>(snapshot);
    const logsWithDates = logs.map(log => ({ ...log, timestamp: new Date(log.timestamp) }));
    return logsWithDates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
  const newLogRef = push(ref(db, 'activityLogs'));
  const newLog = {
    ...log,
    timestamp: getCurrentPHTISOString(),
  };
  await set(newLogRef, newLog);
  return Promise.resolve();
}
