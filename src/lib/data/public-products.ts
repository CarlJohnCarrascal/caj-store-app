'use server';
import { db } from '../firebase';
import { ref, get, set, push, remove } from 'firebase/database';
import type { Product, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';
import { logActivity } from './activity';

const PUBLIC_PRODUCTS_PATH = 'publicProducts';

export async function getPublicProducts(): Promise<Product[]> {
  const snapshot = await get(ref(db, PUBLIC_PRODUCTS_PATH));
  return snapshotToArray<Product>(snapshot).reverse();
}

export async function getPublicProductById(id: string): Promise<Product | undefined> {
  const snapshot = await get(ref(db, `${PUBLIC_PRODUCTS_PATH}/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}

export async function addPublicProduct(product: Omit<Product, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Product> {
  const newProductRef = push(ref(db, PUBLIC_PRODUCTS_PATH));
  const dataToSave = {
    ...product,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newProductRef, dataToSave);
  
  await logActivity({
      type: 'Product',
      action: 'Created',
      details: `Public product "${product.name}" was created.`,
      targetId: newProductRef.key!,
      ...createdBy,
  });

  return { ...dataToSave, id: newProductRef.key! };
}

export async function updatePublicProduct(updatedProduct: Product, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Product | null> {
  const { id, ...data } = updatedProduct;
  const productRef = ref(db, `${PUBLIC_PRODUCTS_PATH}/${id}`);
  const snapshot = await get(productRef);
  if (snapshot.exists()) {
    const existingData = snapshot.val();
    const dataToSave = {
      ...existingData,
      ...data,
      updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
    };
    await set(productRef, dataToSave);
     await logActivity({
      type: 'Product',
      action: 'Updated',
      details: `Public product "${data.name}" was updated.`,
      targetId: id,
      ...updatedBy,
  });
    return { ...dataToSave, id };
  }
  return null;
}


export async function deletePublicProduct(id: string, user: {userId: string, userName: string}): Promise<Product | null> {
  const productRef = ref(db, `${PUBLIC_PRODUCTS_PATH}/${id}`);
  const snapshot = await get(productRef);
  if (snapshot.exists()) {
    const deletedProduct = { id, ...snapshot.val() };
    await remove(productRef);
    await logActivity({
        type: 'Product',
        action: 'Deleted',
        details: `Public product "${deletedProduct.name}" was deleted.`,
        targetId: id,
        ...user
    });
    return deletedProduct;
  }
  return null;
}
