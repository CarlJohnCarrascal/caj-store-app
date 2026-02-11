import { db } from '../firebase';
import { ref, get, set, push, remove } from 'firebase/database';
import type { Collection, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';

export async function getCollections(storeId: string): Promise<Collection[]> {
    const collectionsSnapshot = await get(ref(db, `storeData/${storeId}/collections`));
    const collections = snapshotToArray<Collection>(collectionsSnapshot);
    const customersSnapshot = await get(ref(db, `storeData/${storeId}/customers`));
    const customersData = customersSnapshot.val() || {};

    const collectionsWithCustomerNames = collections.map(collection => {
        const customer = customersData[collection.customerId];
        return {
            ...collection,
            customerName: customer ? customer.name : 'Unknown Customer'
        };
    });
    return collectionsWithCustomerNames;
}

export async function getCollectionNames(storeId: string): Promise<string[]> {
    const snapshot = await get(ref(db, `storeData/${storeId}/collections`));
    const names = new Set<string>();
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot: any) => {
            names.add(childSnapshot.val().name);
        });
    }
    return Promise.resolve([...names]);
}

export async function getCollectionById(storeId: string, id: string): Promise<Collection | undefined> {
    const snapshot = await get(ref(db, `storeData/${storeId}/collections/${id}`));
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return undefined;
}

export async function addCollection(storeId: string, collection: Omit<Collection, 'id' | 'customerName'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Collection> {
    const newCollectionRef = push(ref(db, `storeData/${storeId}/collections`));
    const dataToSave = {
      ...collection,
      createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
    };
    await set(newCollectionRef, dataToSave);
    return { ...dataToSave, id: newCollectionRef.key! };
}

export async function updateCollection(storeId: string, updatedCollection: Omit<Collection, 'customerName'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Collection | null> {
    const { id, ...data } = updatedCollection;
    const collectionRef = ref(db, `storeData/${storeId}/collections/${id}`);
    const snapshot = await get(collectionRef);
    if(snapshot.exists()){
      const existingData = snapshot.val();
      const dataToSave = {
        ...existingData,
        ...data,
        updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() }
      }
      await set(collectionRef, dataToSave);
      return { ...dataToSave, id } as Collection;
    }
    return null;
}

export async function deleteCollection(storeId: string, id: string): Promise<Collection | null> {
    const collectionRef = ref(db, `storeData/${storeId}/collections/${id}`);
    const snapshot = await get(collectionRef);
    if (snapshot.exists()) {
        const deletedCollection = { id, ...snapshot.val() };
        await remove(collectionRef);
        return deletedCollection;
    }
    return null;
}
