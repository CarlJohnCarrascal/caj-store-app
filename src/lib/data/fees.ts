import { db } from '../firebase';
import { ref, get, set, push, update, remove } from 'firebase/database';
import type { FeeThreshold, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';

const defaultFeeThresholds: Omit<FeeThreshold, 'id' | 'createdBy'>[] = [
  { from: 1, to: 110, fee: 5, type: 'fixed', notes: 'Base fee tier 1' },
  { from: 111, to: 599, fee: 10, type: 'fixed', notes: 'Base fee tier 2' },
  { from: 600, to: 920, fee: 15, type: 'fixed', notes: 'Base fee tier 3' },
  { from: 921, to: 1100, fee: 20, type: 'fixed', notes: 'Base fee tier 4' },
  { from: 1101, to: 10000, fee: 20, type: 'per_thousand_flat', notes: 'Fee for amounts from 1101 to 10000' },
  { from: 10001, to: 100000, fee: 10, type: 'per_thousand_flat', notes: 'Fee for amounts over 10000' },
];

export async function getFeeThresholds(storeId: string): Promise<FeeThreshold[]> {
  const thresholdsRef = ref(db, `storeData/${storeId}/feeThresholds`);
  let snapshot = await get(thresholdsRef);

  if (!snapshot.exists()) {
    // Seed data if it doesn't exist
    const updates: { [key: string]: any } = {};
    const defaultUser = { userId: 'system', userName: 'System' };
    defaultFeeThresholds.forEach(threshold => {
      const newThresholdRef = push(thresholdsRef);
      updates[newThresholdRef.key!] = {
        ...threshold,
        createdBy: { ...defaultUser, timestamp: getCurrentPHTISOString() },
      };
    });
    await update(thresholdsRef, updates);
    snapshot = await get(thresholdsRef); // Re-fetch after seeding
  }
  return snapshotToArray<FeeThreshold>(snapshot);
}

export async function addFeeThreshold(storeId: string, threshold: Omit<FeeThreshold, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<FeeThreshold> {
  const newThresholdRef = push(ref(db, `storeData/${storeId}/feeThresholds`));
  const dataToSave = {
    ...threshold,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newThresholdRef, dataToSave);
  return { ...dataToSave, id: newThresholdRef.key! };
}

export async function updateFeeThreshold(storeId: string, id: string, thresholdData: Omit<FeeThreshold, 'id'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<void> {
  const thresholdRef = ref(db, `storeData/${storeId}/feeThresholds/${id}`);
  const snapshot = await get(thresholdRef);
  if (snapshot.exists()) {
    const dataToSave = {
      ...snapshot.val(),
      ...thresholdData,
      updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
    };
    await set(thresholdRef, dataToSave);
  } else {
    throw new Error('Fee threshold not found');
  }
}

export async function deleteFeeThreshold(storeId: string, id: string): Promise<void> {
  const thresholdRef = ref(db, `storeData/${storeId}/feeThresholds/${id}`);
  await remove(thresholdRef);
}
