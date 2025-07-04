'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Product, Account, Customer, CashTransaction, Collection, Order, Expense, AppUser, FeeThreshold } from './types';
import { getCurrentPHTISOString } from './utils';

const DB_NAME = 'caj-store-db';
const DB_VERSION = 2; // Incremented version to trigger upgrade

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
  lastUpdate: 'lastUpdate', // New store for timestamps
} as const;

export type StoreName = typeof STORE_NAMES[keyof typeof STORE_NAMES];

interface LastUpdate {
    storeName: StoreName;
    timestamp: string; // ISO string
}

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
  lastUpdate: { key: string; value: LastUpdate }; // New schema for lastUpdate store
}

let dbPromise: Promise<IDBPDatabase<CajStoreDB>> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB<CajStoreDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // This upgrade function will run if the DB_VERSION is higher than the existing version.
      // It checks for each store and creates it if it doesn't exist, making it safe to run.
      (Object.keys(STORE_NAMES) as Array<keyof typeof STORE_NAMES>).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const keyPath = storeName === 'lastUpdate' ? 'storeName' : 'id';
          db.createObjectStore(storeName, { keyPath });
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
        // Start a transaction on both the target store and the lastUpdate store
        const tx = db.transaction([storeName, 'lastUpdate'], 'readwrite');
        const store = tx.objectStore(storeName);
        const lastUpdateStore = tx.objectStore('lastUpdate');

        // Clear existing data and add new data
        await store.clear();
        await Promise.all(data.map(item => store.put(item)));
        
        // Also update the timestamp for this store
        await lastUpdateStore.put({ storeName, timestamp: getCurrentPHTISOString() });
        
        await tx.done;
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

// New function to get the last update timestamp for a specific store
export async function getLastUpdate(storeName: StoreName): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    try {
        const db = await initDB();
        const record = await db.get('lastUpdate', storeName);
        return record ? record.timestamp : null;
    } catch (error) {
        console.error(`Failed to get last update for ${storeName}:`, error);
        return null;
    }
}

// New function to manually set the last update timestamp
export async function setLastUpdate(storeName: StoreName, timestamp: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const db = await initDB();
        await db.put('lastUpdate', { storeName, timestamp });
    } catch (error) {
        console.error(`Failed to set last update for ${storeName}:`, error);
    }
}
