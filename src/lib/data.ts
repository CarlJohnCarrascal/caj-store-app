
'use server';

import { db } from './firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import type { Product, Account, Customer, CashTransaction, Collection, ActivityLog } from './types';

// Helper function to convert Firebase snapshot to an array
function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
  const items: (T & { id: string })[] = [];
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot: any) => {
      items.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });
  }
  return items;
}

// ==================
// Product Functions
// ==================

export async function getProducts(): Promise<Product[]> {
  const snapshot = await get(ref(db, 'products'));
  return snapshotToArray<Product>(snapshot).reverse();
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const snapshot = await get(ref(db, `products/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}

export async function addProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const newProductRef = push(ref(db, 'products'));
  const newProduct = { ...product, id: newProductRef.key! };
  await set(newProductRef, product);
  return newProduct;
}

export async function updateProduct(updatedProduct: Product): Promise<Product | null> {
  const { id, ...data } = updatedProduct;
  await update(ref(db), { [`/products/${id}`]: data });
  return updatedProduct;
}

export async function deleteProduct(id: string): Promise<Product | null> {
  const productRef = ref(db, `products/${id}`);
  const snapshot = await get(productRef);
  if (snapshot.exists()) {
    const deletedProduct = { id, ...snapshot.val() };
    await remove(productRef);
    return deletedProduct;
  }
  return null;
}

// ==================
// Account Functions
// ==================

export async function getAccounts(): Promise<Account[]> {
  const snapshot = await get(ref(db, 'accounts'));
  return snapshotToArray<Account>(snapshot);
}

export async function addAccount(account: Omit<Account, 'id'>): Promise<Account> {
  const newAccountRef = push(ref(db, 'accounts'));
  const newAccount = { ...account, id: newAccountRef.key! };
  await set(newAccountRef, account);
  return newAccount;
}

export async function deleteAccount(id: string): Promise<Account | null> {
  const accountRef = ref(db, `accounts/${id}`);
  const snapshot = await get(accountRef);
  if (snapshot.exists()) {
    const deletedAccount = { id, ...snapshot.val() };
    await remove(accountRef);
    return deletedAccount;
  }
  return null;
}

// ==================
// Customer Functions
// ==================

export async function getCustomers(): Promise<Customer[]> {
  const snapshot = await get(ref(db, 'customers'));
  return snapshotToArray<Customer>(snapshot);
}

export async function addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
  const newCustomerRef = push(ref(db, 'customers'));
  const newCustomer = { ...customer, id: newCustomerRef.key! };
  await set(newCustomerRef, customer);
  return newCustomer;
}

export async function updateCustomerBalance(customerId: string, amount: number): Promise<Customer | null> {
    const customerRef = ref(db, `customers/${customerId}`);
    const snapshot = await get(customerRef);
    if (snapshot.exists()) {
        const currentBalance = snapshot.val().balance || 0;
        const newBalance = currentBalance + amount;
        await update(customerRef, { balance: newBalance });
        return { id: customerId, ...snapshot.val(), balance: newBalance };
    }
    return null;
}

// =======================
// CashTransaction Functions
// =======================

export async function getCashTransactions(): Promise<CashTransaction[]> {
  const transactionsSnapshot = await get(ref(db, 'cashTransactions'));
  const transactions = snapshotToArray<CashTransaction>(transactionsSnapshot);

  const accountsSnapshot = await get(ref(db, 'accounts'));
  const accountsData = accountsSnapshot.val() || {};

  const transactionsWithAccountNames = transactions.map(transaction => {
    const account = accountsData[transaction.accountUsedId];
    return {
      ...transaction,
      ourAccountName: account ? account.accountName : 'Unknown Account',
      // Firebase stores dates as strings, so convert them back
      createdAt: new Date(transaction.createdAt),
      updatedAt: new Date(transaction.updatedAt),
      ...(transaction.dateRecieved && { dateRecieved: new Date(transaction.dateRecieved) }),
      ...(transaction.dateClaimedOrSent && { dateClaimedOrSent: new Date(transaction.dateClaimedOrSent) }),
    };
  });
  return transactionsWithAccountNames.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function isReferenceNumberDuplicate(reference: string): Promise<boolean> {
  const transactionsRef = ref(db, 'cashTransactions');
  const q = query(transactionsRef, orderByChild('reference'), equalTo(reference));
  const snapshot = await get(q);
  return snapshot.exists();
}

export async function addCashTransaction(transactionData: Omit<CashTransaction, 'id' | 'createdAt' | 'updatedAt' | 'newBalance'> & { datetime?: string }): Promise<CashTransaction> {
  const accountRef = ref(db, `accounts/${transactionData.accountUsedId}`);
  const accountSnapshot = await get(accountRef);
  if (!accountSnapshot.exists()) {
    throw new Error("Account not found");
  }

  const account = accountSnapshot.val();
  let newBalance;
  if (transactionData.transactionType === 'Cash In') {
    newBalance = account.balance + transactionData.amount - transactionData.fee;
  } else { // Cash Out
    newBalance = account.balance - transactionData.amount - transactionData.fee;
  }
  await update(accountRef, { balance: newBalance });

  const transactionDate = transactionData.datetime ? new Date(transactionData.datetime) : new Date();
  
  const newTransactionRef = push(ref(db, 'cashTransactions'));

  const dataToSave: any = {
    ...transactionData,
    newBalance,
    createdAt: transactionDate.toISOString(),
    updatedAt: transactionDate.toISOString(),
  };

  if (transactionData.transactionType === 'Cash In') {
    dataToSave.dateRecieved = transactionDate.toISOString();
  } else {
    dataToSave.dateClaimedOrSent = transactionDate.toISOString();
  }
  
  delete dataToSave.datetime;

  await set(newTransactionRef, dataToSave);
  
  return { ...dataToSave, id: newTransactionRef.key! };
}

export async function updateCashTransactionStatus(id: string, customerId: string, customerName: string): Promise<CashTransaction | null> {
    const transactionRef = ref(db, `cashTransactions/${id}`);
    const snapshot = await get(transactionRef);

    if (snapshot.exists()) {
        const transaction = snapshot.val();
        if (transaction.status === 'Available') {
            const newStatus = transaction.transactionType === 'Cash In' ? 'Delivered' : 'Claimed';
            const updatedAt = new Date().toISOString();
            const updates = {
                status: newStatus,
                updatedAt,
                customerId,
                customerName,
            };
            await update(transactionRef, updates);
            const updatedTransactionData = { ...transaction, ...updates, id };
            return { ...updatedTransactionData, updatedAt: new Date(updatedAt) };
        }
    }
    return null;
}

// =======================
// Collection Functions
// =======================

export async function getCollections(): Promise<Collection[]> {
    const collectionsSnapshot = await get(ref(db, 'collections'));
    const collections = snapshotToArray<Collection>(collectionsSnapshot);
    const customersSnapshot = await get(ref(db, 'customers'));
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

export async function getCollectionNames(): Promise<string[]> {
    const snapshot = await get(ref(db, 'collections'));
    const names = new Set<string>();
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot: any) => {
            names.add(childSnapshot.val().name);
        });
    }
    return Promise.resolve([...names]);
}

export async function getCollectionById(id: string): Promise<Collection | undefined> {
    const snapshot = await get(ref(db, `collections/${id}`));
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return undefined;
}

export async function addCollection(collection: Omit<Collection, 'id' | 'customerName'>): Promise<Collection> {
    const newCollectionRef = push(ref(db, 'collections'));
    const newCollection = { ...collection, id: newCollectionRef.key! };
    await set(newCollectionRef, collection);
    return newCollection;
}

export async function updateCollection(updatedCollection: Omit<Collection, 'customerName'>): Promise<Collection | null> {
    const { id, ...data } = updatedCollection;
    await update(ref(db), { [`/collections/${id}`]: data });
    return updatedCollection as Collection;
}

export async function deleteCollection(id: string): Promise<Collection | null> {
    const collectionRef = ref(db, `collections/${id}`);
    const snapshot = await get(collectionRef);
    if (snapshot.exists()) {
        const deletedCollection = { id, ...snapshot.val() };
        await remove(collectionRef);
        return deletedCollection;
    }
    return null;
}

// =======================
// ActivityLog Functions
// =======================

export async function getActivities(): Promise<ActivityLog[]> {
    const snapshot = await get(ref(db, 'activityLogs'));
    const logs = snapshotToArray<ActivityLog>(snapshot);
    // Convert timestamp strings back to Date objects
    const logsWithDates = logs.map(log => ({ ...log, timestamp: new Date(log.timestamp) }));
    return logsWithDates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
  const newLogRef = push(ref(db, 'activityLogs'));
  const newLog = {
    ...log,
    timestamp: new Date().toISOString(),
  };
  await set(newLogRef, newLog);
  return Promise.resolve();
}
