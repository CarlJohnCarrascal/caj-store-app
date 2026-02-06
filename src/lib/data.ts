

'use server';

import { db, storage } from './firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo, runTransaction, limitToLast } from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject, getBytes } from 'firebase/storage';
import type { Product, Account, Customer, CashTransaction, Collection, Order, CartItem, Expense, AppUser, ChangeTracker, FeeThreshold, EloadingReportData, PrintingReportData, OtherServiceReportData, PrintingPrice, StoreMemberInfo } from './types';
import { getCurrentPHTISOString, getReportPaths } from './utils';

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
// User Functions
// ==================
export async function createUserProfile(user: Omit<AppUser, 'authorized' | 'role' | 'activeStoreId'>): Promise<void> {
  const userRef = ref(db, `users/${user.id}`);
  await set(userRef, {
    name: user.name,
    email: user.email,
    authorized: true, // New users are now authorized by default
    role: 'user', // New users are assigned 'user' role by default
  });
}

export async function getUserById(id: string): Promise<AppUser | null> {
    const snapshot = await get(ref(db, `users/${id}`));
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updateUserAuthorization(userId: string, authorized: boolean, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<void> {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        await update(userRef, {
            authorized: authorized,
            updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
        });
    } else {
        throw new Error('User not found');
    }
}

export async function updateUserRole(userId: string, role: 'admin' | 'user', updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<void> {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        await update(userRef, {
            role: role,
            updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
        });
    } else {
        throw new Error('User not found');
    }
}

export async function getUsers(): Promise<AppUser[]> {
  const snapshot = await get(ref(db, 'users'));
  return snapshotToArray<AppUser>(snapshot);
}

// ==================
// Store Functions
// ==================

export async function getStoreMembers(storeId: string): Promise<StoreMemberInfo[]> {
  const membersRef = ref(db, `storeMembers/${storeId}`);
  const snapshot = await get(membersRef);
  if (snapshot.exists()) {
      const membersData = snapshot.val();
      return Object.keys(membersData).map(userId => ({
          id: userId,
          ...membersData[userId]
      }));
  }
  return [];
}


// ==================
// Product Functions
// ==================

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

// ==================
// Account Functions
// ==================

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

// ==================
// Customer Functions
// ==================

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

// =======================
// CashTransaction Functions
// =======================

export async function getCashTransactions(storeId: string): Promise<CashTransaction[]> {
  const transactionsSnapshot = await get(ref(db, `storeData/${storeId}/cashTransactions`));
  const transactions = snapshotToArray<CashTransaction>(transactionsSnapshot);

  const accountsSnapshot = await get(ref(db, `storeData/${storeId}/accounts`));
  const accountsData = accountsSnapshot.val() || {};

  const transactionsWithAccountNames = transactions.map(transaction => {
    const account = accountsData[transaction.accountUsedId];
    return {
      ...transaction,
      ourAccountName: account ? account.accountName : 'Unknown Account',
    };
  });
  return transactionsWithAccountNames.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCashTransactionById(storeId: string, id: string): Promise<CashTransaction | undefined> {
  const snapshot = await get(ref(db, `storeData/${storeId}/cashTransactions/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}


export async function isReferenceNumberDuplicate(storeId: string, reference: string): Promise<boolean> {
  const transactionsRef = ref(db, `storeData/${storeId}/cashTransactions`);
  const q = query(transactionsRef, orderByChild('reference'), equalTo(reference));
  const snapshot = await get(q);
  return snapshot.exists();
}

export async function getCashTransactionByReference(storeId: string, reference: string): Promise<CashTransaction | null> {
    const transactionsRef = ref(db, `storeData/${storeId}/cashTransactions`);
    const q = query(transactionsRef, orderByChild('reference'), equalTo(reference));
    const snapshot = await get(q);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const id = Object.keys(data)[0];
        return { id, ...data[id] };
    }
    return null;
}


export async function addCashTransaction(storeId: string, transactionData: Omit<CashTransaction, 'id' | 'createdAt' | 'updatedAt' | 'newBalance' | 'transactionDate'> & { datetime?: string }, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<CashTransaction> {
  const accountRef = ref(db, `storeData/${storeId}/accounts/${transactionData.accountUsedId}`);
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
  
  const nowPHTString = getCurrentPHTISOString();
  
  let transactionDateString: string;
  if (transactionData.datetime && transactionData.datetime.length > 0) {
    transactionDateString = `${transactionData.datetime}:00+08:00`;
  } else {
    transactionDateString = nowPHTString;
  }
  
  const newTransactionRef = push(ref(db, `storeData/${storeId}/cashTransactions`));

  const dataToSave: any = {
    ...transactionData,
    newBalance,
    transactionDate: transactionDateString,
    createdAt: nowPHTString,
    updatedAt: nowPHTString,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  
  delete dataToSave.datetime;

  await set(newTransactionRef, dataToSave);
  
  const result = { ...dataToSave, id: newTransactionRef.key! };
  return result;
}

export async function updateCashTransaction(
  storeId: string,
  id: string,
  transactionData: Partial<Omit<CashTransaction, 'id' | 'createdAt' | 'updatedAt' | 'newBalance' | 'transactionDate'>> & { datetime?: string },
  updatedBy: Omit<ChangeTracker, 'timestamp'>
): Promise<CashTransaction> {
    const transactionRef = ref(db, `storeData/${storeId}/cashTransactions/${id}`);
    const oldTransactionSnapshot = await get(transactionRef);
    if (!oldTransactionSnapshot.exists()) {
        throw new Error("Transaction to update not found");
    }
    const oldTransaction: CashTransaction = { id, ...oldTransactionSnapshot.val() };

    let finalNewBalanceForAccount;

    const needsBalanceUpdate = 'amount' in transactionData || 'fee' in transactionData || 'accountUsedId' in transactionData;

    if (needsBalanceUpdate) {
        const oldAccountRef = ref(db, `storeData/${storeId}/accounts/${oldTransaction.accountUsedId}`);
        const oldAccountSnapshot = await get(oldAccountRef);
        if (oldAccountSnapshot.exists()) {
            const oldAccount = oldAccountSnapshot.val();
            let balanceReversal = 0;
            if (oldTransaction.transactionType === 'Cash In') {
                balanceReversal = -oldTransaction.amount + oldTransaction.fee;
            } else { // Cash Out
                balanceReversal = oldTransaction.amount + oldTransaction.fee;
            }
            await update(oldAccountRef, { balance: oldAccount.balance + balanceReversal });
        }

        const newAccountUsedId = transactionData.accountUsedId || oldTransaction.accountUsedId;
        const newTransactionType = transactionData.transactionType || oldTransaction.transactionType;
        const newAmount = transactionData.amount || oldTransaction.amount;
        const newFee = transactionData.fee || oldTransaction.fee;
        
        const newAccountRef = ref(db, `storeData/${storeId}/accounts/${newAccountUsedId}`);
        const newAccountSnapshot = await get(newAccountRef);
        if (!newAccountSnapshot.exists()) {
            throw new Error("New account not found");
        }
        const newAccount = newAccountSnapshot.val();
        let newEffect = 0;
        if (newTransactionType === 'Cash In') {
            newEffect = newAmount - newFee;
        } else { // Cash Out
            newEffect = -newAmount - newFee;
        }
        finalNewBalanceForAccount = newAccount.balance + newEffect;
        await update(newAccountRef, { balance: finalNewBalanceForAccount });
    }

    const nowPHTString = getCurrentPHTISOString();
    let transactionDateString: string;
    if (transactionData.datetime && transactionData.datetime.length > 0) {
        transactionDateString = `${transactionData.datetime}:00+08:00`;
    } else {
        transactionDateString = oldTransaction.transactionDate || nowPHTString;
    }

    const dataToSave: any = {
        ...oldTransaction,
        ...transactionData,
        transactionDate: transactionDateString,
        updatedAt: nowPHTString,
        updatedBy: { ...updatedBy, timestamp: nowPHTString },
    };
    
    if (finalNewBalanceForAccount !== undefined) {
        dataToSave.newBalance = finalNewBalanceForAccount;
    }
    
    delete dataToSave.datetime;

    await set(transactionRef, dataToSave);

    return { id, ...dataToSave };
}

export async function deleteCashTransaction(storeId: string, id: string): Promise<CashTransaction | null> {
    const transactionRef = ref(db, `storeData/${storeId}/cashTransactions/${id}`);
    const snapshot = await get(transactionRef);
    if (snapshot.exists()) {
        const deletedTransaction: CashTransaction = { id, ...snapshot.val() };
        
        if (deletedTransaction.customerId) {
            throw new Error('This transaction cannot be deleted because it is part of a processed order.');
        }

        await remove(transactionRef);
        return deletedTransaction;
    }
    return null;
}


// =======================
// Image Upload Function
// =======================
export async function finalizeReceiptImage(storeId: string, dataUrl: string, folder: 'cashin' | 'cashout', fileName: string): Promise<string> {
  const mainfolder = process.env.IMAGE_FOLDER;
  const path = `${mainfolder}/${storeId}/${folder}/${fileName}`;
    const imageRef = storageRef(storage, path);
    // Directly upload the data URL string
    const snapshot = await uploadString(imageRef, dataUrl, 'data_url');
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}

export async function deleteReceiptImage(storeId: string, transactionId: string, imageUrl: string): Promise<void> {
    // 1. Delete from storage
    const imageStorageRef = storageRef(storage, imageUrl);
    await deleteObject(imageStorageRef);

    // 2. Remove from database
    const transactionRef = ref(db, `storeData/${storeId}/cashTransactions/${transactionId}`);
    await update(transactionRef, {
        receiptImageUrl: null
    });
}


// =======================
// Collection Functions
// =======================

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

// ==================
// Order Functions
// ==================

export async function addOrder(storeId: string, orderData: Omit<Order, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Order> {
    const newOrderRef = push(ref(db, `storeData/${storeId}/orders`));
    const dataToSave = { 
      ...orderData, 
      createdAt: getCurrentPHTISOString(),
      createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
    };
    await set(newOrderRef, dataToSave);
    return { ...dataToSave, id: newOrderRef.key! };
}

export async function getOrders(storeId: string): Promise<Order[]> {
    const snapshot = await get(ref(db, `storeData/${storeId}/orders`));
    const orders = snapshotToArray<Order>(snapshot);
    const ordersWithDates = orders.map(order => ({ ...order, createdAt: order.createdAt }));
    return ordersWithDates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOrderById(storeId: string, id: string): Promise<Order | undefined> {
    const snapshot = await get(ref(db, `storeData/${storeId}/orders/${id}`));
    if (snapshot.exists()) {
        const order = snapshot.val();
        return { id, ...order, createdAt: order.createdAt };
    }
    return undefined;
}

export async function getOrdersByCustomerId(storeId: string, customerId: string): Promise<Order[]> {
    const ordersRef = ref(db, `storeData/${storeId}/orders`);
    const q = query(ordersRef, orderByChild('customerId'), equalTo(customerId));
    const snapshot = await get(q);
    if (!snapshot.exists()) {
        return [];
    }
    const orders = snapshotToArray<Order>(snapshot);
    const ordersWithDates = orders.map(order => ({ ...order, createdAt: order.createdAt }));
    return ordersWithDates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getRecentOrdersByCategory(storeId: string, category: string, limit: number = 20): Promise<Order[]> {
    const ordersRef = ref(db, `storeData/${storeId}/orders`);
    const q = query(ordersRef, limitToLast(limit * 5)); // Fetch more to filter client-side
    const snapshot = await get(q);
    if (!snapshot.exists()) {
        return [];
    }
    
    const allRecentOrders = snapshotToArray<Order>(snapshot);
    
    const filteredOrders = allRecentOrders.filter(order => {
        if (category === 'Store') {
            return order.items.some(item => !['Printing', 'E-loading', 'Other Service', 'CashIO', 'Financial'].includes(item.category));
        }
        return order.items.some(item => item.category === category);
    });

    return filteredOrders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
}


// =======================
// ActivityLog Functions
// =======================

export async function getActivities(storeId: string): Promise<ActivityLog[]> {
    const snapshot = await get(ref(db, `storeData/${storeId}/activityLogs`));
    const logs = snapshotToArray<ActivityLog>(snapshot);
    const logsWithDates = logs.map(log => ({ ...log, timestamp: new Date(log.timestamp) }));
    return logsWithDates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
  const newLogRef = push(ref(db, 'activityLogs'));
  const newLog = {
    ...log,
    timestamp: getCurrentPHTISOString(),
  };
  await set(newLogRef, newLog);
  return Promise.resolve();
}

// ===================
// Expense Functions
// ===================

export async function getExpenses(storeId: string): Promise<Expense[]> {
  const snapshot = await get(ref(db, `storeData/${storeId}/expenses`));
  const expenses = snapshotToArray<Expense>(snapshot);
  const expensesWithDates = expenses.map(e => ({
    ...e,
    date: e.date,
    createdAt: e.createdAt,
  }));
  return expensesWithDates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getExpenseById(storeId: string, id: string): Promise<Expense | undefined> {
  const snapshot = await get(ref(db, `storeData/${storeId}/expenses/${id}`));
  if (snapshot.exists()) {
    const expense = snapshot.val();
    const expenseWithDate = {
      ...expense,
      id,
      date: expense.date,
      createdAt: expense.createdAt,
    };
    return expenseWithDate;
  }
  return undefined;
}

export async function addExpense(storeId: string, expenseData: Omit<Expense, 'id' | 'createdAt'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Expense> {
  const newExpenseRef = push(ref(db, `storeData/${storeId}/expenses`));
  const dataToSave = {
    ...expenseData,
    date: new Date(expenseData.date).toISOString(),
    createdAt: getCurrentPHTISOString(),
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newExpenseRef, dataToSave);
  return { ...dataToSave, id: newExpenseRef.key! };
}

export async function updateExpense(storeId: string, id: string, expenseData: Omit<Expense, 'id' | 'createdAt'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Expense> {
    const expenseRef = ref(db, `storeData/${storeId}/expenses/${id}`);
    const snapshot = await get(expenseRef);
    if(snapshot.exists()){
      const existingData = snapshot.val();
      const dataToSave = {
          ...existingData,
          ...expenseData,
          date: new Date(expenseData.date).toISOString(),
          updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
      };
      await set(expenseRef, dataToSave);
      return { ...dataToSave, id, createdAt: existingData.createdAt };
    }
    throw new Error("Expense not found");
}

export async function deleteExpense(storeId: string, id: string): Promise<Expense | null> {
    const expenseRef = ref(db, `storeData/${storeId}/expenses/${id}`);
    const snapshot = await get(expenseRef);
    if (snapshot.exists()) {
        const deletedExpense = { id, ...snapshot.val() };
        await remove(expenseRef);
        return deletedExpense;
    }
    return null;
}

// ========================
// Fee Threshold Functions
// ========================

const defaultFeeThresholds: Omit<FeeThreshold, 'id' | 'createdBy'>[] = [
  { from: 1, to: 110, fee: 5, type: 'fixed', notes: 'Base fee tier 1' },
  { from: 111, to: 599, fee: 10, type: 'fixed', notes: 'Base fee tier 2' },
  { from: 600, to: 920, fee: 15, type: 'fixed', notes: 'Base fee tier 3' },
  { from: 921, to: 1100, fee: 20, type: 'fixed', notes: 'Base fee tier 4' },
  { from: 1101, to: 10000, fee: 20, type: 'per_thousand_flat', notes: 'Fee for amounts from 1101 to 10000' },
  { from: 10001, to: 100000, fee: 10, type: 'per_thousand_flat', notes: 'Fee for amounts over 10000' },
];

export async function getFeeThresholds(storeId: string): Promise<FeeThreshold[]> {
  const thresholdsRef = ref(db, `storeData/${storeId}/feeThresholds`);
  let snapshot = await get(thresholdsRef);

  if (!snapshot.exists()) {
    // Seed data if it doesn't exist
    const updates: { [key: string]: any } = {};
    const defaultUser = { userId: 'system', userName: 'System' };
    defaultFeeThresholds.forEach(threshold => {
      const newThresholdRef = push(thresholdsRef);
      updates[newThresholdRef.key!] = {
        ...threshold,
        createdBy: { ...defaultUser, timestamp: getCurrentPHTISOString() },
      };
    });
    await update(thresholdsRef, updates);
    snapshot = await get(thresholdsRef); // Re-fetch after seeding
  }
  return snapshotToArray<FeeThreshold>(snapshot);
}

export async function addFeeThreshold(storeId: string, threshold: Omit<FeeThreshold, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<FeeThreshold> {
  const newThresholdRef = push(ref(db, `storeData/${storeId}/feeThresholds`));
  const dataToSave = {
    ...threshold,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newThresholdRef, dataToSave);
  return { ...dataToSave, id: newThresholdRef.key! };
}

export async function updateFeeThreshold(storeId: string, id: string, thresholdData: Omit<FeeThreshold, 'id'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<void> {
  const thresholdRef = ref(db, `storeData/${storeId}/feeThresholds/${id}`);
  const snapshot = await get(thresholdRef);
  if (snapshot.exists()) {
    const dataToSave = {
      ...snapshot.val(),
      ...thresholdData,
      updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
    };
    await set(thresholdRef, dataToSave);
  } else {
    throw new Error('Fee threshold not found');
  }
}

export async function deleteFeeThreshold(storeId: string, id: string): Promise<void> {
  const thresholdRef = ref(db, `storeData/${storeId}/feeThresholds/${id}`);
  await remove(thresholdRef);
}

// ========================
// Printing Price Functions
// ========================

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


// ========================
// Product Reporting Functions
// ========================

export async function initializeProductReport(storeId: string, productId: string) {
  const { overall: overallPath } = getReportPaths(getCurrentPHTISOString());
  const reportRef = ref(db, `storeData/${storeId}/productReports${overallPath}/${productId}`);
  await set(reportRef, {
    totalQuantity: 0,
    totalSales: 0,
    totalOrders: 0,
  });
}

export async function updateProductReports(storeId: string, productId: string, quantity: number, sales: number) {
  const dateStr = getCurrentPHTISOString();
  const paths = getReportPaths(dateStr);

  for (const periodPath of Object.values(paths)) {
    const reportRef = ref(db, `storeData/${storeId}/productReports${periodPath}/${productId}`);
    await runTransaction(reportRef, (currentData: any) => {
      if (currentData === null) {
        currentData = { totalQuantity: 0, totalSales: 0, totalOrders: 0 };
      }

      currentData.totalQuantity = (currentData.totalQuantity || 0) + quantity;
      currentData.totalSales = (currentData.totalSales || 0) + sales;
      currentData.totalOrders = (currentData.totalOrders || 0) + 1;
      
      return currentData;
    });
  }
}

// ========================
// Main Reporting Functions
// ========================

function getCostAndFeeFromDescription(description: string): { cost: number, fee: number } {
    const costMatch = description.match(/Cost: ₱([\d,]+\.\d{2})/);
    const feeMatch = description.match(/Fee: ₱([\d,]+\.\d{2})/);
    const cost = costMatch?.[1] ? parseFloat(costMatch[1].replace(/,/g, '')) : 0;
    const fee = feeMatch?.[1] ? parseFloat(feeMatch[1].replace(/,/g, '')) : 0;
    return { cost, fee };
}


export async function updateSalesReports(storeId: string, order: Order) {
  const paths = getReportPaths(order.createdAt);

  const salesByService: { [key: string]: number } = {};
  const servicesInOrder = new Set<string>();
  let reportableSubtotal = 0;

  for (const item of order.items) {
    let category = 'Store'; // Default category
    if (['Printing', 'E-loading', 'Other Service'].includes(item.category)) {
      category = item.category;
    } else if (item.category === 'CashIO') {
      category = 'CashIO';
    }
    servicesInOrder.add(category);

    let saleValue = 0;
    if (category === 'CashIO' && item.originalTransactionId) {
      const cashTx = await getCashTransactionById(storeId, item.originalTransactionId);
      saleValue = cashTx ? cashTx.fee : 0;
    } else if (['E-loading', 'Other Service'].includes(category)) {
      const { fee } = getCostAndFeeFromDescription(item.description || '');
      saleValue = fee;
    }
     else {
      saleValue = item.price * item.quantity;
    }

    salesByService[category] = (salesByService[category] || 0) + saleValue;
    reportableSubtotal += saleValue;
  }

  const finalReportableSale = reportableSubtotal - order.discount;

  for (const periodPath of Object.values(paths)) {
    const reportRef = ref(db, `storeData/${storeId}/salesReports${periodPath}`);
    await runTransaction(reportRef, (currentData: any) => {
      if (currentData === null) {
        currentData = { totalOrders: 0, totalSales: 0, byService: {} };
      }

      currentData.totalOrders = (currentData.totalOrders || 0) + 1;
      currentData.totalSales = (currentData.totalSales || 0) + finalReportableSale;

      if (!currentData.byService) currentData.byService = {};

      for (const service of servicesInOrder) {
        if (!currentData.byService[service]) {
          currentData.byService[service] = { orders: 0, sales: 0 };
        }
        currentData.byService[service].orders = (currentData.byService[service].orders || 0) + 1;
      }
      
      for (const [service, sales] of Object.entries(salesByService)) {
        if (currentData.byService[service]) {
          currentData.byService[service].sales = (currentData.byService[service].sales || 0) + sales;
        }
      }
      return currentData;
    });
  }
}

export async function updateCashIOReport(storeId: string, transaction: CashTransaction, type: 'allTransactions' | 'orderedTransactions', customerId?: string, factor: 1 | -1 = 1) {
    if (!transaction || !transaction.transactionDate) {
        console.error("updateCashIOReport called with invalid transaction or missing transactionDate", transaction);
        return; // Exit gracefully to prevent crash
    }
    
    const paths = getReportPaths(transaction.transactionDate);
    
    for (const periodPath of Object.values(paths)) {
        const reportRef = ref(db, `storeData/${storeId}/cashIOReports${periodPath}`);
        
        await runTransaction(reportRef, (currentData: any) => {
          
            if (currentData === null) {
                currentData = {
                    cashIn: 0, cashOut: 0, totalTransactions: 0, cashInFee: 0, cashOutFee: 0,
                    cashInTotal: 0, cashOutTotal: 0, totalAmount: 0, totalFee: 0,
                    customers: {}, byAccount: {},
                };
            }

            if (type === 'allTransactions') {
                currentData.totalTransactions = (currentData.totalTransactions || 0) + (1 * factor);
                currentData.totalAmount = (currentData.totalAmount || 0) + (transaction.amount * factor);
                currentData.totalFee = (currentData.totalFee || 0) + (transaction.fee * factor);

                if (!currentData.byAccount) currentData.byAccount = {};
                const accountId = transaction.accountUsedId;
                if (!currentData.byAccount[accountId]) {
                    currentData.byAccount[accountId] = {
                        cashInCount: 0, cashInAmount: 0, cashInFee: 0,
                        cashOutCount: 0, cashOutAmount: 0, cashOutFee: 0,
                    };
                }
                const accountReport = currentData.byAccount[accountId];

                if (transaction.transactionType === 'Cash In') {
                    currentData.cashIn = (currentData.cashIn || 0) + (1 * factor);
                    currentData.cashInFee = (currentData.cashInFee || 0) + (transaction.fee * factor);
                    currentData.cashInTotal = (currentData.cashInTotal || 0) + (transaction.amount * factor);
                    accountReport.cashInCount += factor;
                    accountReport.cashInAmount += (transaction.amount * factor);
                    accountReport.cashInFee += (transaction.fee * factor);
                } else { // Cash Out
                    currentData.cashOut = (currentData.cashOut || 0) + (1 * factor);
                    currentData.cashOutFee = (currentData.cashOutFee || 0) + (transaction.fee * factor);
                    currentData.cashOutTotal = (currentData.cashOutTotal || 0) + (transaction.amount * factor);
                    accountReport.cashOutCount += factor;
                    accountReport.cashOutAmount += (transaction.amount * factor);
                    accountReport.cashOutFee += (transaction.fee * factor);
                }
            }
            
            if (type === 'orderedTransactions') {
                const finalCustomerId = customerId || 'unknown';
                
                if (!currentData.customers) currentData.customers = {};
                if (!currentData.customers[finalCustomerId]) {
                    currentData.customers[finalCustomerId] = {
                        cashIn: 0, cashOut: 0, cashInFee: 0, cashOutFee: 0,
                        cashInTotal: 0, cashOutTotal: 0, totalAmount: 0, totalFee: 0,
                    };
                }
                
                const customerReport = currentData.customers[finalCustomerId];
                customerReport.totalAmount += (transaction.amount * factor);
                customerReport.totalFee += (transaction.fee * factor);

                if (transaction.transactionType === 'Cash In') {
                    customerReport.cashIn += factor;
                    customerReport.cashInFee += (transaction.fee * factor);
                    customerReport.cashInTotal += (transaction.amount * factor);
                } else { // Cash Out
                    customerReport.cashOut += factor;
                    customerReport.cashOutFee += (transaction.fee * factor);
                    customerReport.cashOutTotal += (transaction.amount * factor);
                }
            }
            
            return currentData;
        });
    }
}

export async function updateCustomerReports(storeId: string, type: 'new_customer' | 'order', customerId: string, orderTotal: number = 0) {
    const dateStr = getCurrentPHTISOString();
    const paths = getReportPaths(dateStr);
    const orderValue = Math.abs(orderTotal);

    for (const periodPath of Object.values(paths)) {
        const reportRef = ref(db, `storeData/${storeId}/customerReports${periodPath}`);
        
        await runTransaction(reportRef, (currentData: any) => {
            if (currentData === null) {
                currentData = { newCustomerCount: 0, totalOrders: 0, totalOrderValue: 0, activeCustomers: {} };
            }

            if (type === 'new_customer') {
                currentData.newCustomerCount = (currentData.newCustomerCount || 0) + 1;
            } else if (type === 'order') {
                currentData.totalOrders = (currentData.totalOrders || 0) + 1;
                currentData.totalOrderValue = (currentData.totalOrderValue || 0) + orderValue;

                if (!currentData.activeCustomers) {
                    currentData.activeCustomers = {};
                }
                if (!currentData.activeCustomers[customerId]) {
                    currentData.activeCustomers[customerId] = { orderCount: 0, totalValue: 0 };
                }
                
                currentData.activeCustomers[customerId].orderCount = (currentData.activeCustomers[customerId].orderCount || 0) + 1;
                currentData.activeCustomers[customerId].totalValue = (currentData.activeCustomers[customerId].totalValue || 0) + orderValue;
            }
            
            return currentData;
        });
    }
}


export async function updateEloadingReports(storeId: string, data: { serviceType: string; cost: number; fee: number }) {
    const dateStr = getCurrentPHTISOString();
    const paths = getReportPaths(dateStr);

    for (const periodPath of Object.values(paths)) {
        const reportRef = ref(db, `storeData/${storeId}/eloadingReports${periodPath}`);
        
        await runTransaction(reportRef, (currentData: EloadingReportData | null) => {
            if (currentData === null) {
                currentData = { totalCost: 0, totalFee: 0, byServiceType: {} };
            }

            currentData.totalCost += data.cost;
            currentData.totalFee += data.fee;

            if (!currentData.byServiceType[data.serviceType]) {
                currentData.byServiceType[data.serviceType] = { count: 0, cost: 0, fee: 0 };
            }
            const serviceTypeReport = currentData.byServiceType[data.serviceType];
            serviceTypeReport.count += 1;
            serviceTypeReport.cost += data.cost;
            serviceTypeReport.fee += data.fee;

            return currentData;
        });
    }
}

export async function updatePrintingReports(storeId: string, data: { serviceType: string; size: string; quantity: number, sales: number }) {
    const dateStr = getCurrentPHTISOString();
    const paths = getReportPaths(dateStr);

    for (const periodPath of Object.values(paths)) {
        const reportRef = ref(db, `storeData/${storeId}/printingReports${periodPath}`);
        
        await runTransaction(reportRef, (currentData: PrintingReportData | null) => {
            if (currentData === null) {
                currentData = { totalSales: 0, byServiceType: {} };
            }

            currentData.totalSales += data.sales;

            if (!currentData.byServiceType[data.serviceType]) {
                currentData.byServiceType[data.serviceType] = { count: 0, sales: 0, bySize: {} };
            }
            const serviceTypeReport = currentData.byServiceType[data.serviceType];
            serviceTypeReport.count += data.quantity;
            serviceTypeReport.sales += data.sales;

            if (data.size) {
                 if (!serviceTypeReport.bySize[data.size]) {
                    serviceTypeReport.bySize[data.size] = 0;
                }
                serviceTypeReport.bySize[data.size] += data.quantity;
            }

            return currentData;
        });
    }
}


export async function updateOtherServiceReports(storeId: string, data: { cost: number; fee: number }) {
    const dateStr = getCurrentPHTISOString();
    const paths = getReportPaths(dateStr);

    for (const periodPath of Object.values(paths)) {
        const reportRef = ref(db, `storeData/${storeId}/otherServiceReports${periodPath}`);
        
        await runTransaction(reportRef, (currentData: OtherServiceReportData | null) => {
            if (currentData === null) {
                currentData = { totalCost: 0, totalFee: 0, totalOrders: 0 };
            }

            currentData.totalCost += data.cost;
            currentData.totalFee += data.fee;
            currentData.totalOrders += 1;

            return currentData;
        });
    }
}

export async function regenerateCashIOReports(storeId: string): Promise<void> {
    const allTransactions = await getCashTransactions(storeId);
    const newReportsData: any = {}; // This will hold the regenerated data.

    for (const transaction of allTransactions) {
        const paths = getReportPaths(transaction.transactionDate);
        for (const periodKey of Object.keys(paths)) { // 'daily', 'weekly', etc.
            const path = (paths as any)[periodKey];
            
            const fullPath = `storeData/${storeId}/cashIOReports${path}`;
            
            const currentPeriod = newReportsData[fullPath] || {
                cashIn: 0, cashOut: 0, totalTransactions: 0, cashInFee: 0, cashOutFee: 0,
                cashInTotal: 0, cashOutTotal: 0, totalAmount: 0, totalFee: 0,
                customers: {}, byAccount: {},
            };
            
            // All Transactions part
            currentPeriod.totalTransactions += 1;
            currentPeriod.totalAmount += transaction.amount;
            currentPeriod.totalFee += transaction.fee;
            
            const accountId = transaction.accountUsedId;
            if(!currentPeriod.byAccount) currentPeriod.byAccount = {};
            const accountReport = currentPeriod.byAccount[accountId] || {
                cashInCount: 0, cashInAmount: 0, cashInFee: 0,
                cashOutCount: 0, cashOutAmount: 0, cashOutFee: 0,
            };

            if (transaction.transactionType === 'Cash In') {
                currentPeriod.cashIn += 1;
                currentPeriod.cashInFee += transaction.fee;
                currentPeriod.cashInTotal += transaction.amount;
                accountReport.cashInCount += 1;
                accountReport.cashInAmount += transaction.amount;
                accountReport.cashInFee += transaction.fee;
            } else { // Cash Out
                currentPeriod.cashOut += 1;
                currentPeriod.cashOutFee += transaction.fee;
                currentPeriod.cashOutTotal += transaction.amount;
                accountReport.cashOutCount += 1;
                accountReport.cashOutAmount += transaction.amount;
                accountReport.cashOutFee += transaction.fee;
            }
            currentPeriod.byAccount[accountId] = accountReport;

            // Ordered Transactions part
            if (transaction.customerId) {
                 if(!currentPeriod.customers) currentPeriod.customers = {};
                const customerReport = currentPeriod.customers[transaction.customerId] || {
                    cashIn: 0, cashOut: 0, cashInFee: 0, cashOutFee: 0,
                    cashInTotal: 0, cashOutTotal: 0, totalAmount: 0, totalFee: 0,
                };

                customerReport.totalAmount += transaction.amount;
                customerReport.totalFee += transaction.fee;

                if (transaction.transactionType === 'Cash In') {
                    customerReport.cashIn += 1;
                    customerReport.cashInFee += transaction.fee;
                    customerReport.cashInTotal += transaction.amount;
                } else { // Cash Out
                    customerReport.cashOut += 1;
                    customerReport.cashOutFee += transaction.fee;
                    customerReport.cashOutTotal += transaction.amount;
                }
                currentPeriod.customers[transaction.customerId] = customerReport;
            }
            
            newReportsData[fullPath] = currentPeriod;
        }
    }

    const reportsRef = ref(db, `storeData/${storeId}/cashIOReports`);
    await set(reportsRef, {}); // Clear existing reports

    const updates: { [key: string]: any } = {};
    for (const [path, data] of Object.entries(newReportsData)) {
      const relativePath = path.replace(`storeData/${storeId}/cashIOReports`, '');
      updates[relativePath] = data;
    }
    
    if (Object.keys(updates).length > 0) {
      await update(reportsRef, updates);
    }
}
