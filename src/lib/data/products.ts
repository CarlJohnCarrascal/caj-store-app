import { db } from '../firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import type { Product, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';

export async function getProducts(storeId: string): Promise<Product[]> {
  const snapshot = await get(ref(db, `storeData/${storeId}/products`));
  return snapshotToArray<Product>(snapshot).reverse();
}

export async function getProductById(storeId: string, id: string): Promise<Product | undefined> {
  const snapshot = await get(ref(db, `storeData/${storeId}/products/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}

export async function isBarcodeDuplicate(storeId: string, barcode: string, currentProductId?: string): Promise<boolean> {
    const productsRef = ref(db, `storeData/${storeId}/products`);
    const q = query(productsRef, orderByChild('barcode'), equalTo(barcode));
    const snapshot = await get(q);
    if (snapshot.exists()) {
      if (currentProductId) {
        // If we are updating, check if the found product is the same as the one being updated
        const data = snapshot.val();
        const foundProductId = Object.keys(data)[0];
        return foundProductId !== currentProductId;
      }
      return true; // Found a duplicate on creation
    }
    return false;
}

export async function addProduct(storeId: string, product: Omit<Product, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Product> {
  const newProductRef = push(ref(db, `storeData/${storeId}/products`));
  const dataToSave = {
    ...product,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newProductRef, dataToSave);
  return { ...dataToSave, id: newProductRef.key! };
}

export async function updateProduct(storeId: string, updatedProduct: Product, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Product | null> {
  const { id, ...data } = updatedProduct;
  const productRef = ref(db, `storeData/${storeId}/products/${id}`);
  const snapshot = await get(productRef);
  if (snapshot.exists()) {
    const existingData = snapshot.val();
    const dataToSave = {
      ...existingData,
      ...data,
      updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
    };
    await set(productRef, dataToSave);
    return { ...dataToSave, id };
  }
  return null;
}

export async function deleteProduct(storeId: string, id: string): Promise<Product | null> {
  const productRef = ref(db, `storeData/${storeId}/products/${id}`);
  const snapshot = await get(productRef);
  if (snapshot.exists()) {
    const deletedProduct = { id, ...snapshot.val() };
    await remove(productRef);
    return deletedProduct;
  }
  return null;
}
