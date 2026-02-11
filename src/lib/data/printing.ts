import { db } from '../firebase';
import { ref, get, set, push, remove } from 'firebase/database';
import type { PrintingPrice, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';

export async function getPrintingPrices(storeId: string): Promise<PrintingPrice[]> {
  const snapshot = await get(ref(db, `storeData/${storeId}/printingPrices`));
  return snapshotToArray<PrintingPrice>(snapshot);
}

export async function addPrintingPrice(storeId: string, price: Omit<PrintingPrice, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<PrintingPrice> {
  const newPriceRef = push(ref(db, `storeData/${storeId}/printingPrices`));
  const dataToSave = {
    ...price,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newPriceRef, dataToSave);
  return { ...dataToSave, id: newPriceRef.key! };
}

export async function updatePrintingPrice(storeId: string, id: string, priceData: Omit<PrintingPrice, 'id'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<void> {
  const priceRef = ref(db, `storeData/${storeId}/printingPrices/${id}`);
  const snapshot = await get(priceRef);
  if (snapshot.exists()) {
    const dataToSave = {
      ...snapshot.val(),
      ...priceData,
      updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
    };
    await set(priceRef, dataToSave);
  } else {
    throw new Error('Printing price not found');
  }
}

export async function deletePrintingPrice(storeId: string, id: string): Promise<void> {
  const priceRef = ref(db, `storeData/${storeId}/printingPrices/${id}`);
  await remove(priceRef);
}
