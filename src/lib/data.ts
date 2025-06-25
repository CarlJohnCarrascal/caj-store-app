

'use server';

import { db } from './firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo, runTransaction } from 'firebase/database';
import type { Product, Account, Customer, CashTransaction, Collection, ActivityLog, Order, CartItem, Expense } from './types';
import { getISOWeek, format } from 'date-fns';

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

// Helper to format a Date object into 'YYYY-MM-DDTHH:mm:ss+08:00' for the current time
function getCurrentPHTISOString(): string {
  const now = new Date();
  // Create a new date object for PHT (UTC+8) by adding 8 hours
  const phtTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const year = phtTime.getUTCFullYear();
  const month = String(phtTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(phtTime.getUTCDate()).padStart(2, '0');
  const hours = String(phtTime.getUTCHours()).padStart(2, '0');
  const minutes = String(phtTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(phtTime.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
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

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const snapshot = await get(ref(db, `customers/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
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
      ...(transaction.dateSent && { dateSent: new Date(transaction.dateSent) }),
      ...(transaction.dateReceived && { dateReceived: new Date(transaction.dateReceived) }),
    };
  });
  return transactionsWithAccountNames.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getCashTransactionById(id: string): Promise<CashTransaction | undefined> {
  const snapshot = await get(ref(db, `cashTransactions/${id}`));
  if (snapshot.exists()) {
    const transaction = snapshot.val();
    const transactionWithDateObjects = {
        ...transaction,
        id,
        createdAt: new Date(transaction.createdAt),
        updatedAt: new Date(transaction.updatedAt),
        ...(transaction.dateSent && { dateSent: new Date(transaction.dateSent as any) }),
        ...(transaction.dateReceived && { dateReceived: new Date(transaction.dateReceived as any) }),
    };
    return transactionWithDateObjects;
  }
  return undefined;
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
  
  const nowPHTString = getCurrentPHTISOString();
  
  let transactionDateString: string;
  if (transactionData.datetime && transactionData.datetime.length > 0) {
    // Input is like 'YYYY-MM-DDTHH:mm', assume it's PHT. Append seconds and timezone.
    transactionDateString = `${transactionData.datetime}:00+08:00`;
  } else {
    // If no datetime provided, use current time in PHT
    transactionDateString = nowPHTString;
  }
  
  const newTransactionRef = push(ref(db, 'cashTransactions'));

  const dataToSave: any = {
    ...transactionData,
    newBalance,
    createdAt: nowPHTString,
    updatedAt: nowPHTString,
  };

  if (transactionData.transactionType === 'Cash In') {
    dataToSave.dateSent = transactionDateString;
  } else {
    dataToSave.dateReceived = transactionDateString;
  }
  
  delete dataToSave.datetime;

  await set(newTransactionRef, dataToSave);
  
  return { ...dataToSave, id: newTransactionRef.key! };
}

export async function updateCashTransaction(id: string, transactionData: Omit<CashTransaction, 'id' | 'createdAt' | 'updatedAt' | 'newBalance'> & { datetime?: string }): Promise<CashTransaction> {
    const transactionRef = ref(db, `cashTransactions/${id}`);
    const oldTransactionSnapshot = await get(transactionRef);
    if (!oldTransactionSnapshot.exists()) {
        throw new Error("Transaction to update not found");
    }
    const oldTransaction = oldTransactionSnapshot.val();

    // Note: This simplified update does NOT adjust account balances. 
    // Balance adjustments should be handled separately to avoid race conditions.

    const nowPHTString = getCurrentPHTISOString();
    let transactionDateString: string;
    if (transactionData.datetime && transactionData.datetime.length > 0) {
        transactionDateString = `${transactionData.datetime}:00+08:00`;
    } else {
        transactionDateString = oldTransaction.dateSent || oldTransaction.dateReceived || nowPHTString; // Fallback to existing date
    }

    const dataToSave: any = {
        ...oldTransaction, // preserve fields not in form like createdAt, newBalance
        ...transactionData,
        updatedAt: nowPHTString,
    };
    
    if (transactionData.transactionType === 'Cash In') {
      dataToSave.dateSent = transactionDateString;
      dataToSave.dateReceived = null;
    } else { // Cash Out
      dataToSave.dateReceived = transactionDateString;
      dataToSave.dateSent = null;
    }
    
    delete dataToSave.datetime;

    await update(transactionRef, dataToSave);

    return { ...dataToSave, id };
}

export async function updateCashTransactionStatus(id: string, customerId: string): Promise<CashTransaction | null> {
    const transactionRef = ref(db, `cashTransactions/${id}`);
    const snapshot = await get(transactionRef);

    if (snapshot.exists()) {
        const transaction = snapshot.val();

        // This transaction has already been processed in an order. Return null to prevent re-running reports.
        if (transaction.customerId) {
            return null;
        }

        const newStatus = transaction.transactionType === 'Cash In' ? 'Delivered' : 'Claimed';
        const updatedAt = getCurrentPHTISOString();
        const updates = {
            status: newStatus,
            updatedAt,
            customerId,
        };
        await update(transactionRef, updates);
        const updatedTransactionData = { ...transaction, ...updates, id };
        return { ...updatedTransactionData, updatedAt: new Date(updatedAt), createdAt: new Date(transaction.createdAt) };
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

// ==================
// Order Functions
// ==================

export async function addOrder(orderData: Omit<Order, 'id'>): Promise<Order> {
    const newOrderRef = push(ref(db, 'orders'));
    const dataToSave = { ...orderData, createdAt: getCurrentPHTISOString() };
    await set(newOrderRef, dataToSave);
    return { ...dataToSave, id: newOrderRef.key! };
}

export async function getOrders(): Promise<Order[]> {
    const snapshot = await get(ref(db, 'orders'));
    const orders = snapshotToArray<Order>(snapshot);
    const ordersWithDates = orders.map(order => ({ ...order, createdAt: new Date(order.createdAt) }));
    return ordersWithDates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getOrderById(id: string): Promise<Order | undefined> {
    const snapshot = await get(ref(db, `orders/${id}`));
    if (snapshot.exists()) {
        const order = snapshot.val();
        return { id, ...order, createdAt: new Date(order.createdAt) };
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
    const ordersWithDates = orders.map(order => ({ ...order, createdAt: new Date(order.createdAt) }));
    return ordersWithDates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    date: new Date(e.date),
    createdAt: new Date(e.createdAt),
  }));
  return expensesWithDates.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getExpenseById(id: string): Promise<Expense | undefined> {
  const snapshot = await get(ref(db, `expenses/${id}`));
  if (snapshot.exists()) {
    const expense = snapshot.val();
    const expenseWithDate = {
      ...expense,
      id,
      date: new Date(expense.date),
      createdAt: new Date(expense.createdAt),
    };
    return expenseWithDate;
  }
  return undefined;
}

export async function addExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const newExpenseRef = push(ref(db, 'expenses'));
  const dataToSave = {
    ...expenseData,
    date: new Date(expenseData.date).toISOString(),
    createdAt: getCurrentPHTISOString(),
  };
  await set(newExpenseRef, dataToSave);
  return { ...dataToSave, id: newExpenseRef.key! };
}

export async function updateExpense(id: string, expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const expenseRef = ref(db, `expenses/${id}`);
    const dataToSave = {
        ...expenseData,
        date: new Date(expenseData.date).toISOString(),
    };
    await update(expenseRef, dataToSave);
    return { ...dataToSave, id, createdAt: '' }; // createdAt is not updated
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

function getReportPaths(date: Date) {
    const year = format(date, 'yyyy');
    const month = format(date, 'MM');
    const week = getISOWeek(date);
    const day = format(date, 'yyyy-MM-dd');
    
    return {
        daily: `/daily/${day}`,
        weekly: `/weekly/${year}-${week}`,
        monthly: `/monthly/${year}-${month}`,
        yearly: `/yearly/${year}`,
        overall: `/overall/summary`
    };
}

export async function updateSalesReports(order: Order) {
  const date = new Date(order.createdAt);
  const paths = getReportPaths(date);

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
      // The sale/revenue from a CashIO transaction is its fee. This is always positive.
      saleValue = cashTx ? cashTx.fee : 0;
    } else {
      // For regular products and other services, the sale is the price.
      saleValue = item.price * item.quantity;
    }

    salesByService[category] = (salesByService[category] || 0) + saleValue;
    reportableSubtotal += saleValue;
  }

  // The final reportable sale is the sum of revenue from all items, minus the discount.
  // This correctly ignores any customer balance applied.
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
        // This check is needed in case a service exists in the report but not in the current order.
        if (currentData.byService[service]) {
          currentData.byService[service].sales = (currentData.byService[service].sales || 0) + sales;
        }
      }
      return currentData;
    });
  }
}

export async function updateCashIOReport(transaction: CashTransaction, type: 'allTransactions' | 'orderedTransactions', customerId?: string) {
    const date = transaction.createdAt ? new Date(transaction.createdAt) : new Date();
    const paths = getReportPaths(date);

    for (const periodPath of Object.values(paths)) {
        const reportRef = ref(db, `cashIOReports${periodPath}`);
        
        await runTransaction(reportRef, (currentData: any) => {
            if (currentData === null) {
                currentData = {
                    cashIn: 0,
                    cashOut: 0,
                    cashInFee: 0,
                    cashOutFee: 0,
                    cashInTotal: 0,
                    cashOutTotal: 0,
                    totalAmount: 0,
                    totalFee: 0,
                    customers: {},
                };
            }

            // This part runs for ALL transactions to update top-level stats
            if (type === 'allTransactions') {
                currentData.totalAmount = (currentData.totalAmount || 0) + transaction.amount;
                currentData.totalFee = (currentData.totalFee || 0) + transaction.fee;

                if (transaction.transactionType === 'Cash In') {
                    currentData.cashIn = (currentData.cashIn || 0) + 1;
                    currentData.cashInFee = (currentData.cashInFee || 0) + transaction.fee;
                    currentData.cashInTotal = (currentData.cashInTotal || 0) + transaction.amount;
                } else { // Cash Out
                    currentData.cashOut = (currentData.cashOut || 0) + 1;
                    currentData.cashOutFee = (currentData.cashOutFee || 0) + transaction.fee;
                    currentData.cashOutTotal = (currentData.cashOutTotal || 0) + transaction.amount;
                }
            }
            
            // This part runs ONLY for ordered transactions to update the customer breakdown
            if (type === 'orderedTransactions') {
                const finalCustomerId = customerId || 'unknown';
                
                if (!currentData.customers) {
                    currentData.customers = {};
                }
                if (!currentData.customers[finalCustomerId]) {
                    currentData.customers[finalCustomerId] = {
                        cashIn: 0,
                        cashOut: 0,
                        cashInFee: 0,
                        cashOutFee: 0,
                        cashInTotal: 0,
                        cashOutTotal: 0,
                        totalAmount: 0,
                        totalFee: 0,
                    };
                }
                
                const customerReport = currentData.customers[finalCustomerId];
                customerReport.totalAmount = (customerReport.totalAmount || 0) + transaction.amount;
                customerReport.totalFee = (customerReport.totalFee || 0) + transaction.fee;

                if (transaction.transactionType === 'Cash In') {
                    customerReport.cashIn = (customerReport.cashIn || 0) + 1;
                    customerReport.cashInFee = (customerReport.cashInFee || 0) + transaction.fee;
                    customerReport.cashInTotal = (customerReport.cashInTotal || 0) + transaction.amount;
                } else { // Cash Out
                    customerReport.cashOut = (customerReport.cashOut || 0) + 1;
                    customerReport.cashOutFee = (customerReport.cashOutFee || 0) + transaction.fee;
                    customerReport.cashOutTotal = (customerReport.cashOutTotal || 0) + transaction.amount;
                }
            }
            
            return currentData;
        });
    }
}

export async function updateCustomerReports(type: 'new_customer' | 'order', customerId: string, orderTotal: number = 0) {
    const date = new Date(); // Use current date for the report
    const paths = getReportPaths(date);
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
                // Update overall stats
                currentData.totalOrders = (currentData.totalOrders || 0) + 1;
                currentData.totalOrderValue = (currentData.totalOrderValue || 0) + orderValue;

                // Update specific customer stats (including 'unknown')
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

