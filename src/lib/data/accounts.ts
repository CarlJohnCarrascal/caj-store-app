import { db } from '../firebase';
import { ref, get, set, push, remove } from 'firebase/database';
import type { Account, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';

export async function getAccounts(storeId: string): Promise<Account[]> {
  const snapshot = await get(ref(db, `storeData/${storeId}/accounts`));
  return snapshotToArray<Account>(snapshot);
}

export async function getAccountById(storeId: string, id: string): Promise<Account | undefined> {
  const snapshot = await get(ref(db, `storeData/${storeId}/accounts/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}

export async function addAccount(storeId: string, account: Omit<Account, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Account> {
  const newAccountRef = push(ref(db, `storeData/${storeId}/accounts`));
  const dataToSave = {
    ...account,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newAccountRef, dataToSave);
  return { ...dataToSave, id: newAccountRef.key! };
}

export async function deleteAccount(storeId: string, id: string): Promise<Account | null> {
  const accountRef = ref(db, `storeData/${storeId}/accounts/${id}`);
  const snapshot = await get(accountRef);
  if (snapshot.exists()) {
    const deletedAccount = { id, ...snapshot.val() };
    await remove(accountRef);
    return deletedAccount;
  }
  return null;
}
