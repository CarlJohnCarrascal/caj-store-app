import { db } from '../firebase';
import { ref, get, set, push, update, remove } from 'firebase/database';
import type { Customer, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';
import { getOrdersByCustomerId } from './orders';

export async function getCustomers(storeId: string): Promise<Customer[]> {
  const snapshot = await get(ref(db, `storeData/${storeId}/customers`));
  return snapshotToArray<Customer>(snapshot);
}

export async function getCustomerById(storeId: string, id: string): Promise<Customer | undefined> {
  const snapshot = await get(ref(db, `storeData/${storeId}/customers/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}

export async function addCustomer(storeId: string, customer: Omit<Customer, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Customer> {
  const newCustomerRef = push(ref(db, `storeData/${storeId}/customers`));
  const dataToSave = {
    ...customer,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newCustomerRef, dataToSave);
  return { ...dataToSave, id: newCustomerRef.key! };
}

export async function updateCustomer(storeId: string, id: string, customerData: Omit<Customer, 'id'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Customer> {
    const customerRef = ref(db, `storeData/${storeId}/customers/${id}`);
    const snapshot = await get(customerRef);
    if(snapshot.exists()){
      const existingData = snapshot.val();
      const dataToSave = {
          ...existingData,
          ...customerData,
          updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
      };
      await set(customerRef, dataToSave);
      return { ...dataToSave, id };
    }
    throw new Error('Customer not found');
}


export async function updateCustomerBalance(storeId: string, customerId: string, amount: number): Promise<Customer | null> {
    const customerRef = ref(db, `storeData/${storeId}/customers/${customerId}`);
    const snapshot = await get(customerRef);
    if (snapshot.exists()) {
        const currentBalance = snapshot.val().balance || 0;
        const newBalance = currentBalance + amount;
        await update(customerRef, { balance: newBalance });
        return { id: customerId, ...snapshot.val(), balance: newBalance };
    }
    return null;
}

export async function deleteCustomer(storeId: string, id: string): Promise<Customer | null> {
    const orders = await getOrdersByCustomerId(storeId, id);
    if (orders.length > 0) {
        throw new Error('Cannot delete a customer with existing orders.');
    }
    const customerRef = ref(db, `storeData/${storeId}/customers/${id}`);
    const snapshot = await get(customerRef);
    if (snapshot.exists()) {
        const deletedCustomer = { id, ...snapshot.val() };
        await remove(customerRef);
        return deletedCustomer;
    }
    return null;
}
