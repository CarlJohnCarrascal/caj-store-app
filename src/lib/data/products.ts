
import { db } from '../firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import type { Product, ChangeTracker, StockHistoryEntry } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';
import { logActivity } from './activity';

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
  const now = getCurrentPHTISOString();
  
  const historyRef = push(ref(db, `storeData/${storeId}/products/${newProductRef.key}/history`));
  const initialHistory: StockHistoryEntry = {
    id: historyRef.key!,
    type: 'initial',
    quantityChange: product.stock,
    newStock: product.stock,
    price: product.price,
    cost: product.cost,
    notes: 'Initial stock',
    timestamp: now,
    user: { id: createdBy.userId, name: createdBy.userName },
  };

  const dataToSave = {
    ...product,
    createdBy: { ...createdBy, timestamp: now },
    history: {
        [historyRef.key!]: initialHistory
    }
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

export async function updateProductStock(
  storeId: string,
  productId: string,
  adjustment: {
    type: 'stock-in' | 'stock-out' | 'correction' | 'sale' | 'return';
    quantityChange: number;
    notes?: string;
    newPrice?: number;
    newCost?: number;
    orderId?: string;
  },
  user: { userId: string; userName: string }
): Promise<void> {
  const productRef = ref(db, `storeData/${storeId}/products/${productId}`);
  
  await runTransaction(productRef, (product: Product | null) => {
    if (!product) {
      // If product is null, abort the transaction
      return; 
    }
    
    const currentStock = product.stock || 0;
    const newStock = currentStock + adjustment.quantityChange;

    const updates: Partial<Product> = {
      stock: newStock,
    };
    
    // Logic for price/cost change on restock
    if (adjustment.type === 'stock-in' && currentStock <= 0) {
      if (adjustment.newPrice !== undefined) {
        updates.price = adjustment.newPrice;
      }
      if (adjustment.newCost !== undefined) {
        updates.cost = adjustment.newCost;
      }
    }
    
    const historyRef = push(ref(db, `storeData/${storeId}/products/${productId}/history`));
    const historyEntry: StockHistoryEntry = {
      id: historyRef.key!,
      type: adjustment.type,
      quantityChange: adjustment.quantityChange,
      newStock,
      notes: adjustment.notes,
      timestamp: getCurrentPHTISOString(),
      user: { id: user.userId, name: user.userName },
      orderId: adjustment.orderId,
      price: updates.price || product.price,
      cost: updates.cost || product.cost,
    };
    
    if (!product.history) {
      product.history = {};
    }
    product.history[historyRef.key!] = historyEntry;
    
    Object.assign(product, updates);

    logActivity({
      type: 'Product',
      action: 'Updated',
      details: `Stock for "${product.name}" changed by ${adjustment.quantityChange}. New stock: ${newStock}. Reason: ${adjustment.type}.`,
      targetId: productId,
      ...user,
    });
    
    return product;
  });
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
