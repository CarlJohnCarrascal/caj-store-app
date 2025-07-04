'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Product, Account, Customer, CashTransaction, Collection, Order, Expense, AppUser, FeeThreshold } from './types';

const DB_NAME = 'caj-store-db';
const DB_VERSION = 1;

// Define all the object stores
export const STORE_NAMES = {
  products: 'products',
  accounts: 'accounts',
  customers: 'customers',
  cashTransactions: 'cashTransactions',
  collections: 'collections',
  orders: 'orders',
  expenses: 'expenses',
  users: 'users',
  feeThresholds: 'feeThresholds',
  activityLogs: 'activityLogs',
} as const;

export type StoreName = typeof STORE_NAMES[keyof typeof STORE_NAMES];

// Define the database schema
interface CajStoreDB extends DBSchema {
  products: { key: string; value: Product };
  accounts: { key: string; value: Account };
  customers: { key: string; value: Customer };
  cashTransactions: { key: string; value: CashTransaction };
  collections: { key: string; value: Collection };
  orders: { key: string; value: Order };
  expenses: { key: string; value: Expense };
  users: { key: string; value: AppUser };
  feeThresholds: { key: string; value: FeeThreshold };
  activityLogs: { key: string; value: any };
}

let dbPromise: Promise<IDBPDatabase<CajStoreDB>> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB<CajStoreDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create a store for each collection
      Object.values(STORE_NAMES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    },
  });
  return dbPromise;
};

export async function getStoreData<T>(storeName: StoreName): Promise<T[]> {
    if (typeof window === 'undefined') return [];
    try {
        const db = await initDB();
        return db.getAll(storeName);
    } catch (error) {
        console.error(`Failed to get data from ${storeName}:`, error);
        return [];
    }
}

export async function setStoreData<T extends {id: string}>(storeName: StoreName, data: T[]): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const db = await initDB();
        const tx = db.transaction(storeName, 'readwrite');
        await tx.store.clear();
        await Promise.all([
            ...data.map(item => tx.store.put(item)),
            tx.done
        ]);
    } catch (error) {
        console.error(`Failed to set data in ${storeName}:`, error);
    }
}

export async function deleteItem(storeName: StoreName, id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const db = await initDB();
        await db.delete(storeName, id);
    } catch (error) {
        console.error(`Failed to delete item ${id} from ${storeName}:`, error);
    }
}
