import { db } from '../firebase';
import { ref, get, set, update, runTransaction } from 'firebase/database';
import type { Order, CashTransaction, EloadingReportData, PrintingReportData, OtherServiceReportData, ProductReportData } from '../types';
import { getCurrentPHTISOString, getReportPaths } from '../utils';
import { getCashTransactions } from './cash-transactions';
import { getCostAndFeeFromDescription } from './helpers';

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
    if (category === 'CashIO') {
      // For CashIO, only the fee is considered sales. The amount is a pass-through.
      const description = typeof item.description === 'string' ? item.description : '';
      const feeMatch = description.match(/Fee: ₱([\d,]+\.\d{2})/);
      const fee = feeMatch?.[1] ? parseFloat(feeMatch[1].replace(/,/g, '')) : 0;
      saleValue = fee;
    } else if (['E-loading', 'Other Service'].includes(category)) {
      const { fee } = getCostAndFeeFromDescription(item.description || '');
      saleValue = fee;
    } else {
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
