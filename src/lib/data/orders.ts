
import { db } from '../firebase';
import { ref, get, set, push, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import type { Order, CartItem, CashTransaction } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray, getCostAndFeeFromDescription } from './helpers';
import { getCashTransactionById, updateCashTransaction } from './cash-transactions';
import { logActivity } from './activity';
import { updateEloadingReports, updatePrintingReports, updateOtherServiceReports, updateProductReports, updateCashIOReport, updateSalesReports, updateCustomerReports } from './reports';
import { updateCustomerBalance } from './customers';

type ProcessOrderPayload = {
    customerId: string;
    customerName: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    amountTendered: number;
    applyCustomerBalance: boolean;
    initialCustomerBalance: number;
    settlementType: 'pay_order' | 'add_to_balance';
};


export async function processOrder(storeId: string, orderData: ProcessOrderPayload, user: { userId: string; userName: string; }) {
    const {
        customerId,
        customerName,
        items,
        subtotal,
        discount,
        total,
        amountTendered,
        applyCustomerBalance,
        initialCustomerBalance,
        settlementType,
    } = orderData;
    
    let updatedTransaction: CashTransaction | null = null;
    
    for (const item of items) {
        switch (item.category) {
            case 'CashIO':
                if (item.originalTransactionId) {
                    const cashTx = await getCashTransactionById(storeId, item.originalTransactionId);
                    if (cashTx) {
                        const finalStatus = cashTx.transactionType === 'Cash In' ? 'Delivered' : 'Claimed';
                        updatedTransaction = await updateCashTransaction(storeId, cashTx.id, { 
                            status: finalStatus,
                            customerId,
                        }, user);
                        await logActivity({
                            type: 'CashIO',
                            action: 'Updated',
                            details: `Transaction for "${customerName}" was marked as ${finalStatus} via checkout.`,
                            targetId: item.originalTransactionId,
                            ...user
                        });
                    }
                }
                break;
            case 'E-loading': {
                const description = typeof item.description === 'string' ? item.description : '';
                const { fee } = getCostAndFeeFromDescription(description);
                const serviceType = item.name.replace('E-loading: ', '').trim();
                const totalCost = item.price - fee;
                await updateEloadingReports(storeId, { serviceType, cost: totalCost, fee });
                break;
            }
            case 'Printing': {
                const serviceType = item.name.replace('Printing: ', '').trim();
                const size = item.dimensions !== 'N/A' ? item.dimensions : '';
                await updatePrintingReports(storeId, { serviceType, size, quantity: item.quantity, sales: item.price * item.quantity });
                break;
            }
            case 'Other Service': {
                const { fee } = getCostAndFeeFromDescription(item.description || '');
                const totalCost = item.price - fee;
                await updateOtherServiceReports(storeId, { cost: totalCost, fee });
                break;
            }
            case 'Financial':
                break;
            default:
                await updateProductReports(storeId, item.id, item.quantity, item.price * item.quantity);
                break;
        }
    }

    const isUnknownCustomer = customerId === 'unknown';
    const balanceUsed = applyCustomerBalance && !isUnknownCustomer ? initialCustomerBalance : 0;
    
    const finalAmountTendered = total < 0 ? 0 : amountTendered;
    let changeToBalance = 0;

    if (settlementType === 'add_to_balance') {
      changeToBalance = finalAmountTendered - total;
    }

    const totalBalanceUpdate = changeToBalance - balanceUsed;
    
    const orderPayload: Omit<Order, 'id'> = {
        customerId,
        customerName,
        items,
        subtotal,
        discount,
        total,
        amountTendered: finalAmountTendered,
        settlementType,
        applyCustomerBalance: applyCustomerBalance,
        createdAt: '',
    };

    if (!isUnknownCustomer) {
        orderPayload.initialCustomerBalance = initialCustomerBalance;
        orderPayload.newCustomerBalance = initialCustomerBalance + totalBalanceUpdate;
    }

    const newOrder = await addOrder(storeId, orderPayload, user);
    
    if (updatedTransaction) {
        await updateCashIOReport(storeId, updatedTransaction, 'orderedTransactions', customerId);
    }

    await logActivity({
        type: 'Order',
        action: 'Created',
        details: `New order placed for ${customerName} for ₱${total.toFixed(2)}.`,
        targetId: newOrder.id,
        ...user,
    });
    
    await updateSalesReports(storeId, newOrder);
    const orderValueForReport = Math.abs(total);
    await updateCustomerReports(storeId, 'order', customerId, orderValueForReport);

    if (!isUnknownCustomer && totalBalanceUpdate !== 0) {
        await updateCustomerBalance(storeId, customerId, totalBalanceUpdate);
        await logActivity({
            type: 'Customer',
            action: 'Updated',
            details: `Balance for ${customerName} updated by ₱${totalBalanceUpdate.toFixed(2)} from an order.`,
            targetId: customerId,
            ...user,
        });
    }
}


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

export async function getRecentOrdersByCategory(storeId: string, category: 'Store' | 'Printing' | 'E-loading' | 'Other Service' | 'CashIO' | 'all', limit: number = 20): Promise<Order[]> {
    const ordersRef = ref(db, `storeData/${storeId}/orders`);
    const q = query(ordersRef, limitToLast(category === 'all' ? limit : limit * 5));
    const snapshot = await get(q);
    if (!snapshot.exists()) {
        return [];
    }
    
    const allRecentOrders = snapshotToArray<Order>(snapshot);
    const sortedOrders = allRecentOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (category === 'all') {
        return sortedOrders.slice(0, limit);
    }
    
    const filteredOrders = sortedOrders.filter(order => {
        if (category === 'Store') {
            return order.items.some(item => !['Printing', 'E-loading', 'Other Service', 'CashIO', 'Financial'].includes(item.category));
        }
        return order.items.some(item => item.category === category);
    });

    return filteredOrders.slice(0, limit);
}
