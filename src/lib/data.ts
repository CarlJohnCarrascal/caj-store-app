
'use server';

import { db } from './firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo, runTransaction } from 'firebase/database';
import type { Product, Account, Customer, CashTransaction, Collection, ActivityLog, Order, CartItem, Expense, AppUser, ChangeTracker, FeeThreshold } from './types';
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
export async function createUserProfile(user: Omit<AppUser, 'authorized' | 'role'>): Promise<void> {
  const userRef = ref(db, `users/${user.id}`);
  await set(userRef, {
    name: user.name,
    email: user.email,
    authorized: false, // New users are not authorized by default
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

export async function addProduct(product: Omit<Product, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Product> {
  const newProductRef = push(ref(db, 'products'));
  const dataToSave = {
    ...product,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newProductRef, dataToSave);
  return { ...dataToSave, id: newProductRef.key! };
}

export async function updateProduct(updatedProduct: Product, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Product | null> {
  const { id, ...data } = updatedProduct;
  const productRef = ref(db, `products/${id}`);
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

export async function addAccount(account: Omit<Account, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Account> {
  const newAccountRef = push(ref(db, 'accounts'));
  const dataToSave = {
    ...account,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newAccountRef, dataToSave);
  return { ...dataToSave, id: newAccountRef.key! };
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

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const snapshot = await get(ref(db, `customers/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}

export async function addCustomer(customer: Omit<Customer, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Customer> {
  const newCustomerRef = push(ref(db, 'customers'));
  const dataToSave = {
    ...customer,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newCustomerRef, dataToSave);
  return { ...dataToSave, id: newCustomerRef.key! };
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

export async function deleteCustomer(id: string): Promise<Customer | null> {
    const orders = await getOrdersByCustomerId(id);
    if (orders.length > 0) {
        throw new Error('Cannot delete a customer with existing orders.');
    }
    const customerRef = ref(db, `customers/${id}`);
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
    };
  });
  return transactionsWithAccountNames.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCashTransactionById(id: string): Promise<CashTransaction | undefined> {
  const snapshot = await get(ref(db, `cashTransactions/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}


export async function isReferenceNumberDuplicate(reference: string): Promise<boolean> {
  const transactionsRef = ref(db, 'cashTransactions');
  const q = query(transactionsRef, orderByChild('reference'), equalTo(reference));
  const snapshot = await get(q);
  return snapshot.exists();
}

export async function addCashTransaction(transactionData: Omit<CashTransaction, 'id' | 'createdAt' | 'updatedAt' | 'newBalance' | 'transactionDate'> & { datetime?: string }, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<CashTransaction> {
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
  
  const nowPHTString = getCurrentPHTISOString();
  
  let transactionDateString: string;
  if (transactionData.datetime && transactionData.datetime.length > 0) {
    // Treat the datetime-local string as PHT and format it correctly with seconds and timezone
    transactionDateString = `${transactionData.datetime}:00+08:00`;
  } else {
    transactionDateString = nowPHTString;
  }
  
  const newTransactionRef = push(ref(db, 'cashTransactions'));

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
  id: string,
  transactionData: Omit<CashTransaction, 'id' | 'createdAt' | 'updatedAt' | 'newBalance' | 'transactionDate'> & { datetime?: string },
  updatedBy: Omit<ChangeTracker, 'timestamp'>
): Promise<{ oldTransaction: CashTransaction, newTransaction: CashTransaction }> {
    const transactionRef = ref(db, `cashTransactions/${id}`);
    const oldTransactionSnapshot = await get(transactionRef);
    if (!oldTransactionSnapshot.exists()) {
        throw new Error("Transaction to update not found");
    }
    const oldTransaction: CashTransaction = { id, ...oldTransactionSnapshot.val() };

    // --- Reverse old transaction on account balance ---
    const oldAccountRef = ref(db, `accounts/${oldTransaction.accountUsedId}`);
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

    // --- Apply new transaction on account balance ---
    const newAccountRef = ref(db, `accounts/${transactionData.accountUsedId}`);
    const newAccountSnapshot = await get(newAccountRef);
    if (!newAccountSnapshot.exists()) {
        throw new Error("New account not found");
    }
    const newAccount = newAccountSnapshot.val();
    let newEffect = 0;
    if (transactionData.transactionType === 'Cash In') {
        newEffect = transactionData.amount - transactionData.fee;
    } else { // Cash Out
        newEffect = -transactionData.amount - transactionData.fee;
    }
    const finalNewBalanceForAccount = newAccount.balance + newEffect;
    await update(newAccountRef, { balance: finalNewBalanceForAccount });

    // --- Prepare and save the updated transaction ---
    const nowPHTString = getCurrentPHTISOString();
    let transactionDateString: string;
    if (transactionData.datetime && transactionData.datetime.length > 0) {
        transactionDateString = `${transactionData.datetime}:00+08:00`;
    } else {
        transactionDateString = oldTransaction.transactionDate || nowPHTString;
    }

    const dataToSave: any = {
        ...oldTransactionSnapshot.val(),
        ...transactionData,
        newBalance: finalNewBalanceForAccount,
        transactionDate: transactionDateString,
        updatedAt: nowPHTString,
        updatedBy: { ...updatedBy, timestamp: nowPHTString },
    };
    
    delete dataToSave.datetime;

    await set(transactionRef, dataToSave);

    const newTransaction: CashTransaction = { id, ...dataToSave, transactionDate: transactionDateString };
    
    return { oldTransaction, newTransaction };
}

export async function updateCashTransactionStatus(id: string, customerId: string): Promise<CashTransaction | null> {
    const transactionRef = ref(db, `cashTransactions/${id}`);
    const snapshot = await get(transactionRef);

    if (snapshot.exists()) {
        const transaction = snapshot.val();
        if (transaction.customerId) {
            return { id, ...transaction }; // Return existing transaction if already processed
        }

        const newStatus = transaction.transactionType === 'Cash In' ? 'Delivered' : 'Claimed';
        const updatedAt = getCurrentPHTISOString();
        const updates = {
            status: newStatus,
            updatedAt,
            customerId,
        };
        await update(transactionRef, updates);
        return { ...transaction, ...updates, id };
    }
    return null;
}

export async function deleteCashTransaction(id: string): Promise<CashTransaction | null> {
    const transactionRef = ref(db, `cashTransactions/${id}`);
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

export async function addCollection(collection: Omit<Collection, 'id' | 'customerName'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Collection> {
    const newCollectionRef = push(ref(db, 'collections'));
    const dataToSave = {
      ...collection,
      createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
    };
    await set(newCollectionRef, dataToSave);
    return { ...dataToSave, id: newCollectionRef.key! };
}

export async function updateCollection(updatedCollection: Omit<Collection, 'customerName'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Collection | null> {
    const { id, ...data } = updatedCollection;
    const collectionRef = ref(db, `collections/${id}`);
    const snapshot = await get(collectionRef);
    if(snapshot.exists()) {
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

// ==================
// Order Functions
// ==================

export async function addOrder(orderData: Omit<Order, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Order> {
    const newOrderRef = push(ref(db, 'orders'));
    const dataToSave = { 
      ...orderData, 
      createdAt: getCurrentPHTISOString(),
      createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
    };
    await set(newOrderRef, dataToSave);
    return { ...dataToSave, id: newOrderRef.key! };
}

export async function getOrders(): Promise<Order[]> {
    const snapshot = await get(ref(db, 'orders'));
    const orders = snapshotToArray<Order>(snapshot);
    const ordersWithDates = orders.map(order => ({ ...order, createdAt: order.createdAt }));
    return ordersWithDates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOrderById(id: string): Promise<Order | undefined> {
    const snapshot = await get(ref(db, `orders/${id}`));
    if (snapshot.exists()) {
        const order = snapshot.val();
        return { id, ...order, createdAt: order.createdAt };
    }
    return undefined;
}

export async function getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    const ordersRef = ref(db, 'orders');
    const q = query(ordersRef, orderByChild('customerId'), equalTo(customerId));
    const snapshot = await get(q);
    if (!snapshot.exists()) {
        return [];
    }
    const orders = snapshotToArray<Order>(snapshot);
    const ordersWithDates = orders.map(order => ({ ...order, createdAt: order.createdAt }));
    return ordersWithDates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}


// =======================
// ActivityLog Functions
// =======================

export async function getActivities(): Promise<ActivityLog[]> {
    const snapshot = await get(ref(db, 'activityLogs'));
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

export async function getExpenses(): Promise<Expense[]> {
  const snapshot = await get(ref(db, 'expenses'));
  const expenses = snapshotToArray<Expense>(snapshot);
  const expensesWithDates = expenses.map(e => ({
    ...e,
    date: e.date,
    createdAt: e.createdAt,
  }));
  return expensesWithDates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getExpenseById(id: string): Promise<Expense | undefined> {
  const snapshot = await get(ref(db, `expenses/${id}`));
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

export async function addExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Expense> {
  const newExpenseRef = push(ref(db, 'expenses'));
  const dataToSave = {
    ...expenseData,
    date: new Date(expenseData.date).toISOString(),
    createdAt: getCurrentPHTISOString(),
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newExpenseRef, dataToSave);
  return { ...dataToSave, id: newExpenseRef.key! };
}

export async function updateExpense(id: string, expenseData: Omit<Expense, 'id' | 'createdAt'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Expense> {
    const expenseRef = ref(db, `expenses/${id}`);
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

export async function deleteExpense(id: string): Promise<Expense | null> {
    const expenseRef = ref(db, `expenses/${id}`);
    const snapshot = await get(expenseRef);
    if (snapshot.exists()) {
        const deletedExpense = { id, ...snapshot.val() };
        await remove(expenseRef);
        return deletedExpense;
    }
    return null;
}

// ========================
// Reporting Functions
// ========================

export async function updateSalesReports(order: Order) {
  const paths = getReportPaths(order.createdAt);

  const salesByService: { [key: string]: number } = {};
  const servicesInOrder = new Set<string>();
  let reportableSubtotal = 0;

  for (const item of order.items) {
    let category = 'Store'; // Default category
    if (['CashIO', 'Printing', 'E-loading', 'Other Service'].includes(item.category)) {
      category = item.category;
    }
    servicesInOrder.add(category);

    let saleValue = 0;
    if (category === 'CashIO' && item.originalTransactionId) {
      const cashTx = await getCashTransactionById(item.originalTransactionId);
      saleValue = cashTx ? cashTx.fee : 0;
    } else {
      saleValue = item.price * item.quantity;
    }

    salesByService[category] = (salesByService[category] || 0) + saleValue;
    reportableSubtotal += saleValue;
  }

  const finalReportableSale = reportableSubtotal - order.discount;

  for (const periodPath of Object.values(paths)) {
    const reportRef = ref(db, `salesReports${periodPath}`);
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

export async function updateCashIOReport(transaction: CashTransaction, type: 'allTransactions' | 'orderedTransactions', customerId?: string, factor: 1 | -1 = 1) {
    // const dateForReport = new Date(transaction.transactionDate);
    // if (isNaN(dateForReport.getTime())) {
    //   console.error(`Invalid transactionDate received for report update: ${transaction.transactionDate}`);
    //   return;
    // }

    const paths = getReportPaths(transaction.transactionDate);
    
    for (const periodPath of Object.values(paths)) {
        const reportRef = ref(db, `cashIOReports${periodPath}`);
        
        await runTransaction(reportRef, (currentData: any) => {
          
            if (currentData === null) {
                // if (factor === -1) {
                //   console.error(`Could not find report entry at path ${reportRef.toString()} to reverse transaction. Path was generated from date: ${transaction.transactionDate}`);
                //   return; 
                // }
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
                    // if (factor === -1) return;
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

export async function updateCustomerReports(type: 'new_customer' | 'order', customerId: string, orderTotal: number = 0) {
    const dateStr = getCurrentPHTISOString();
    const paths = getReportPaths(dateStr);
    const orderValue = Math.abs(orderTotal);

    for (const periodPath of Object.values(paths)) {
        const reportRef = ref(db, `customerReports${periodPath}`);
        
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

export async function getFeeThresholds(): Promise<FeeThreshold[]> {
  const thresholdsRef = ref(db, 'feeThresholds');
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

export async function addFeeThreshold(threshold: Omit<FeeThreshold, 'id'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<FeeThreshold> {
  const newThresholdRef = push(ref(db, 'feeThresholds'));
  const dataToSave = {
    ...threshold,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newThresholdRef, dataToSave);
  return { ...dataToSave, id: newThresholdRef.key! };
}

export async function updateFeeThreshold(id: string, thresholdData: Omit<FeeThreshold, 'id'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<void> {
  const thresholdRef = ref(db, `feeThresholds/${id}`);
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

export async function deleteFeeThreshold(id: string): Promise<void> {
  const thresholdRef = ref(db, `feeThresholds/${id}`);
  await remove(thresholdRef);
}

// ========================
// Product Reporting Functions
// ========================

export async function initializeProductReport(productId: string) {
  const { overall: overallPath } = getReportPaths(getCurrentPHTISOString());
  const reportRef = ref(db, `productReports${overallPath}/${productId}`);
  await set(reportRef, {
    totalQuantity: 0,
    totalSales: 0,
    totalOrders: 0,
  });
}

export async function updateProductReports(productId: string, quantity: number, sales: number) {
  const dateStr = getCurrentPHTISOString();
  const paths = getReportPaths(dateStr);

  for (const periodPath of Object.values(paths)) {
    const reportRef = ref(db, `productReports${periodPath}/${productId}`);
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




    
