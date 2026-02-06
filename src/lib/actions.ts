

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addProduct, deleteProduct, updateProduct, addCustomer, addAccount, deleteAccount, addCollection, updateCollection, deleteCollection, logActivity, updateCustomerBalance, isReferenceNumberDuplicate, addOrder, addExpense, updateExpense, deleteExpense, updateUserAuthorization, getUserById, updateUserRole, getFeeThresholds, addFeeThreshold, updateFeeThreshold, deleteFeeThreshold, initializeProductReport, updateProductReports, getCashTransactionById, deleteCustomer, updateEloadingReports, updatePrintingReports, updateOtherServiceReports, isBarcodeDuplicate, regenerateCashIOReports, createUserProfile, updateCashIOReport, updateSalesReports, updateCustomerReports, finalizeReceiptImage, deleteReceiptImage, getCustomerById, addPrintingPrice, deletePrintingPrice, updatePrintingPrice, updateCustomer, addCashTransaction, updateCashTransaction, deleteCashTransaction } from './data';
import { Product, CartItem, Customer, Account, Collection, CashTransaction, Order, AppUser, PrintingPrice, Store, StoreMemberInfo } from '@/lib/types';
import { ref, get, update, remove, push, set, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';
import { getCurrentPHTISOString } from './utils';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  show: z.coerce.boolean(),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock: z.coerce.number().min(0, 'Stock must be positive'),
  barcode: z.string().optional(),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  image: z.string().url('Image must be a valid URL').or(z.literal('')).optional(),
  unit: z.enum(['each', 'kg']),
});

function getUserFromFormData(data: FormData) {
    const userId = data.get('userId') as string;
    const userName = data.get('userName') as string;
    if (!userId || !userName) {
        throw new Error('User information is missing. You must be logged in.');
    }
    return { userId, userName };
}

export async function addProductAction(storeId: string, data: FormData) {
  const user = getUserFromFormData(data);
  const rawData = Object.fromEntries(data.entries());
  
  const validatedFields = productSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error('Invalid product data.');
  }

  if (validatedFields.data.barcode) {
    const isDuplicate = await isBarcodeDuplicate(storeId, validatedFields.data.barcode);
    if (isDuplicate) {
      throw new Error(`Barcode "${validatedFields.data.barcode}" is already assigned to another product.`);
    }
  }

  const newProduct = await addProduct(storeId, validatedFields.data, user);
  
  await initializeProductReport(storeId, newProduct.id);

  await logActivity({
    type: 'Product',
    action: 'Created',
    details: `Product "${newProduct.name}" was created.`,
    targetId: newProduct.id,
    ...user,
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath('/admin/activity-logs');
}

export async function updateProductAction(storeId: string, id: string, data: FormData) {
  const user = getUserFromFormData(data);
  const rawData = Object.fromEntries(data.entries());
  
  const validatedFields = productSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error('Invalid product data.');
  }

  if (validatedFields.data.barcode) {
    const isDuplicate = await isBarcodeDuplicate(storeId, validatedFields.data.barcode, id);
    if (isDuplicate) {
      throw new Error(`Barcode "${validatedFields.data.barcode}" is already assigned to another product.`);
    }
  }

  const product: Product = { id, ...validatedFields.data };
  await updateProduct(storeId, product, user);

  await logActivity({
      type: 'Product',
      action: 'Updated',
      details: `Product "${product.name}" was updated.`,
      targetId: product.id,
      ...user,
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath(`/admin/edit/${id}`);
  revalidatePath('/admin/activity-logs');
}

export async function deleteProductAction(storeId: string, id: string, user: { userId: string; userName: string }) {
  const deletedProduct = await deleteProduct(storeId, id);
  if (deletedProduct) {
    await logActivity({
        type: 'Product',
        action: 'Deleted',
        details: `Product "${deletedProduct.name}" was deleted.`,
        targetId: id,
        ...user,
    });
  }

  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath('/admin/activity-logs');
}

export async function createUserProfileAction(userData: Omit<AppUser, 'authorized' | 'role' | 'activeStoreId'>) {
    await createUserProfile(userData);
    await logActivity({
        type: 'User',
        action: 'Created',
        details: `New user account created for ${userData.name} (${userData.email}).`,
        targetId: userData.id,
        userId: userData.id, // The user created themselves
        userName: userData.name
    });
    revalidatePath('/admin/users');
    revalidatePath('/admin/activity-logs');
}


export async function updateUserAuthorizationAction(userId: string, authorized: boolean, updatedBy: { userId: string, userName: string }) {
    // Security check: ensure the user performing the action is an admin.
    const actor = await getUserById(updatedBy.userId);
    if (!actor || actor.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can change user authorization.');
    }

    await updateUserAuthorization(userId, authorized, updatedBy);

    const targetUser = await getUserById(userId);

    await logActivity({
        type: 'User',
        action: 'Authorization',
        details: `Access for ${targetUser?.name || 'user'} was ${authorized ? 'granted' : 'revoked'}.`,
        targetId: userId,
        ...updatedBy,
    });
    
    revalidatePath('/admin/users');
    revalidatePath('/admin/activity-logs');
}

export async function updateUserRoleAction(userId: string, role: 'admin' | 'user', updatedBy: { userId: string, userName: string }) {
    const actor = await getUserById(updatedBy.userId);
    if (!actor || actor.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can change user roles.');
    }

    if (userId === updatedBy.userId && role !== 'admin') {
        throw new Error('Admins cannot change their own role.');
    }

    await updateUserRole(userId, role, updatedBy);

    const targetUser = await getUserById(userId);

    await logActivity({
        type: 'RoleChange',
        action: 'Updated',
        details: `${targetUser?.name || 'user'} was assigned the role: ${role}.`,
        targetId: userId,
        ...updatedBy,
    });

    revalidatePath('/admin/users');
    revalidatePath('/admin/activity-logs');
}


const processOrderSchema = z.object({
    customerId: z.string(),
    customerName: z.string().min(1),
    items: z.array(z.any()),
    subtotal: z.number(),
    discount: z.number(),
    total: z.number(),
    amountTendered: z.number(),
    applyCustomerBalance: z.boolean(),
    initialCustomerBalance: z.number(),
    settlementType: z.enum(['pay_order', 'add_to_balance']),
    userId: z.string(),
    userName: z.string(),
    storeId: z.string(),
});

function getCostAndFeeFromDescription(description: string): { cost: number, fee: number } {
    const costMatch = description.match(/Cost: ₱([\d,]+\.\d{2})/);
    const feeMatch = description.match(/Fee: ₱([\d,]+\.\d{2})/);
    const cost = costMatch?.[1] ? parseFloat(costMatch[1].replace(/,/g, '')) : 0;
    const fee = feeMatch?.[1] ? parseFloat(feeMatch[1].replace(/,/g, '')) : 0;
    return { cost, fee };
}


export async function processOrderAction(
    orderData: z.infer<typeof processOrderSchema>
) {
    const validatedOrder = processOrderSchema.safeParse(orderData);
    if (!validatedOrder.success) {
        console.error(validatedOrder.error.flatten().fieldErrors);
        throw new Error('Invalid order data provided.');
    }

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
        userId,
        userName,
        storeId,
    } = validatedOrder.data;

    const user = { userId, userName };
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
                // No specific reporting for this internal category
                break;
            default: // This is a 'Store' product
                await updateProductReports(storeId, item.id, item.quantity, item.price * item.quantity);
                break;
        }
    }

    const isUnknownCustomer = customerId === 'unknown';
    const balanceUsed = applyCustomerBalance && !isUnknownCustomer ? initialCustomerBalance : 0;
    
    // Correctly handle negative totals (from Cash Out)
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
        createdAt: '', // Will be set by addOrder
    };

    if (!isUnknownCustomer) {
        orderPayload.initialCustomerBalance = initialCustomerBalance;
        orderPayload.newCustomerBalance = initialCustomerBalance + totalBalanceUpdate;
    }

    const newOrder = await addOrder(storeId, orderPayload, user);
    
    // Pass the fetched/updated transaction directly to avoid another DB call
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
    
    revalidatePath('/admin/activity-logs');
    revalidatePath('/admin/cashio');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${customerId}`);
}


const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  location: z.string().min(1, 'Location is required'),
  balance: z.coerce.number().default(0),
});


export async function addCustomerAction(storeId: string, data: FormData): Promise<Customer> {
  const user = getUserFromFormData(data);
  const rawData = Object.fromEntries(data.entries());

  const validatedFields = customerSchema.safeParse(rawData);

  if (!validatedFields.success) {
    throw new Error('Invalid customer data.');
  }

  const newCustomer = await addCustomer(storeId, validatedFields.data as Omit<Customer, 'id'>, user);
  await logActivity({
    type: 'Customer',
    action: 'Created',
    details: `Customer "${newCustomer.name}" was added.`,
    targetId: newCustomer.id,
    ...user,
  });
  
  await updateCustomerReports(storeId, 'new_customer', newCustomer.id);

  revalidatePath('/admin/customers');
  revalidatePath('/admin/activity-logs');
  return newCustomer;
}

export async function updateCustomerAction(storeId: string, id: string, data: FormData): Promise<Customer> {
    const user = getUserFromFormData(data);
    const rawData = Object.fromEntries(data.entries());

    const validatedFields = customerSchema.safeParse(rawData);
    if (!validatedFields.success) {
        throw new Error('Invalid customer data.');
    }
    
    const updatedData = validatedFields.data as Omit<Customer, 'id'>;

    const updatedCustomer = await updateCustomer(storeId, id, updatedData, user);
    
    await logActivity({
        type: 'Customer',
        action: 'Updated',
        details: `Customer "${updatedCustomer.name}" was updated.`,
        targetId: updatedCustomer.id,
        ...user,
    });
    
    revalidatePath('/admin/customers');
    revalidatePath(`/admin/customers/${id}`);
    revalidatePath('/admin/activity-logs');
    return updatedCustomer;
}

export async function createFinancialTransactionOrderAction(
    storeId: string,
    customerId: string, 
    amount: number, // Positive for payment, negative for adding to balance
    user: { userId: string, userName: string }
) {
    if (!customerId || customerId === 'unknown') {
        throw new Error('Cannot update balance for an unknown customer.');
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
        throw new Error('Invalid amount provided.');
    }

    const customer = await getCustomerById(storeId, customerId);
    if (!customer) {
        throw new Error('Customer not found.');
    }

    const settlementType = amount > 0 ? 'pay_order' : 'add_to_balance';
    const total = -amount; // If payment is 100 (positive), total is -100. If adding 100 to balance (negative), total is 100.
    const description = amount > 0 ? 'Customer Payment' : 'Balance Adjustment';

    const financialItem: CartItem = {
        id: `financial-${Date.now()}`,
        name: description,
        price: total,
        quantity: 1,
        category: 'Financial',
        group: 'Financial',
        show: false,
        stock: 0,
        unit: 'each',
        description: `Amount: ₱${Math.abs(amount).toFixed(2)}`,
    };

    const orderPayload: Omit<Order, 'id'> = {
        customerId: customer.id,
        customerName: customer.name,
        items: [financialItem],
        subtotal: total,
        discount: 0,
        total: total,
        amountTendered: amount > 0 ? amount : 0, // Tendered amount is the payment
        settlementType,
        applyCustomerBalance: false,
        initialCustomerBalance: customer.balance,
        newCustomerBalance: customer.balance - total,
        createdAt: '', // will be set by addOrder
    };

    const newOrder = await addOrder(storeId, orderPayload, user);

    await updateCustomerBalance(storeId, customerId, -total); // update balance by -total (which is +amount)

    await logActivity({
        type: 'Order',
        action: 'Created',
        details: `Financial transaction of ₱${amount.toFixed(2)} for ${customer.name} recorded as order.`,
        targetId: newOrder.id,
        ...user,
    });
    
    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath('/admin/customers');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/activity-logs');
}

export async function deleteCustomerAction(storeId: string, id: string, user: { userId: string, userName: string }) {
    const deletedCustomer = await deleteCustomer(storeId, id);
    if(deletedCustomer) {
        await logActivity({
            type: 'Customer',
            action: 'Deleted',
            details: `Customer "${deletedCustomer.name}" was deleted.`,
            targetId: id,
            ...user,
        });
    }
    revalidatePath('/admin/customers');
    revalidatePath('/admin/activity-logs');
}


const accountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  balance: z.coerce.number().default(0),
});

export async function addAccountAction(storeId: string, data: FormData) {
  const user = getUserFromFormData(data);
  const rawData = Object.fromEntries(data.entries());

  const validatedFields = accountSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error('Invalid account data.');
  }

  const newAccount = await addAccount(storeId, validatedFields.data as Omit<Account, 'id'>, user);
  await logActivity({
      type: 'Account',
      action: 'Created',
      details: `Account "${newAccount.accountName}" was created.`,
      targetId: newAccount.id,
      ...user,
  });

  revalidatePath('/admin/accounts');
  revalidatePath('/admin/cashio');
  revalidatePath('/admin/activity-logs');
}

export async function deleteAccountAction(storeId: string, id: string, user: { userId: string, userName: string }) {
    const deletedAccount = await deleteAccount(storeId, id);
    if(deletedAccount) {
        await logActivity({
            type: 'Account',
            action: 'Deleted',
            details: `Account "${deletedAccount.accountName}" was deleted.`,
            targetId: id,
            ...user,
        });
    }

    revalidatePath('/admin/accounts');
    revalidatePath('/admin/cashio');
    revalidatePath('/admin/activity-logs');
}

const cashTransactionSchema = z.object({
  transactionType: z.enum(['Cash In', 'Cash Out']),
  accountUsedId: z.string().min(1, 'Please select an account.'),
  paymentMethod: z.enum(['Gcash', 'Maya', 'Other']),
  status: z.enum(['Delivered', 'Available', 'Claimed', 'Processing']),
  accountName: z.string().min(1, "Sender/Receiver's account name is required."),
  accountNumber: z.string().min(1, "Sender/Receiver's account number is required."),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  fee: z.coerce.number().min(0, 'Fee cannot be negative.'),
  reference: z.string().min(1, 'Reference is required.'),
  message: z.string().optional().default(''),
  datetime: z.string().optional(),
  fromScanned: z.string().optional(),
  receiptImageUrl: z.string().optional(),
});

export async function addCashTransactionAction(storeId: string, data: FormData): Promise<CashTransaction> {
  const user = getUserFromFormData(data);
  const rawData = Object.fromEntries(data.entries());

  const validatedFields = cashTransactionSchema.safeParse(rawData);
  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid cash transaction data.');
  }

  const newTransaction = await addCashTransaction(storeId, validatedFields.data, user);

  await logActivity({
    type: 'CashIO',
    action: 'Created',
    details: `${newTransaction.transactionType} of ₱${newTransaction.amount.toFixed(2)} for "${validatedFields.data.accountName}" was recorded.`,
    targetId: newTransaction.id,
    ...user,
  });
  
  await updateCashIOReport(storeId, newTransaction, 'allTransactions');

  revalidatePath('/admin/cashio');
  revalidatePath('/admin/activity-logs');
  revalidatePath('/admin/accounts');
  
  return newTransaction;
}

export async function updateCashTransactionAction(storeId: string, id: string, data: FormData) {
  const user = getUserFromFormData(data);
  const rawData = Object.fromEntries(data.entries());
  
  const validatedFields = cashTransactionSchema.partial().safeParse(rawData);
  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid cash transaction data.');
  }
  
  const oldTransactionSnapshot = await get(ref(db, `storeData/${storeId}/cashTransactions/${id}`));
  if (!oldTransactionSnapshot.exists()) {
    throw new Error('Transaction not found to update.');
  }
  const oldTransaction: CashTransaction = { id, ...oldTransactionSnapshot.val() };
  
  const newTransaction = await updateCashTransaction(storeId, id, validatedFields.data, user);
  
  // Reverse old transaction from reports
  await updateCashIOReport(storeId, oldTransaction, 'allTransactions', undefined, -1);
  if (oldTransaction.customerId) {
      await updateCashIOReport(storeId, oldTransaction, 'orderedTransactions', oldTransaction.customerId, -1);
  }

  // Add new transaction to reports
  await updateCashIOReport(storeId, newTransaction, 'allTransactions');
  if (newTransaction.customerId) {
      await updateCashIOReport(storeId, newTransaction, 'orderedTransactions', newTransaction.customerId);
  }

  await logActivity({
    type: 'CashIO',
    action: 'Updated',
    details: `Transaction for "${newTransaction.accountName}" was updated.`,
    targetId: newTransaction.id,
    ...user,
  });

  revalidatePath('/admin/cashio');
  revalidatePath(`/admin/cashio/edit/${id}`);
  revalidatePath('/admin/activity-logs');
  revalidatePath('/admin/reports/cashio');
  revalidatePath('/admin/accounts');
}

export async function deleteCashTransactionAction(storeId: string, id: string, user: { userId: string, userName:string }) {
    const deletedTransaction = await deleteCashTransaction(storeId, id);

    if (deletedTransaction) {
        // Reverse account balance change
        const accountRef = ref(db, `storeData/${storeId}/accounts/${deletedTransaction.accountUsedId}`);
        const accountSnapshot = await get(accountRef);
        if (accountSnapshot.exists()) {
            const account = accountSnapshot.val();
            let balanceReversal = 0;
            if (deletedTransaction.transactionType === 'Cash In') {
                balanceReversal = -deletedTransaction.amount + deletedTransaction.fee;
            } else { // Cash Out
                balanceReversal = deletedTransaction.amount + deletedTransaction.fee;
            }
            await update(accountRef, { balance: account.balance + balanceReversal });
        }

        // Reverse report data
        await updateCashIOReport(storeId, deletedTransaction, 'allTransactions', undefined, -1);
        if (deletedTransaction.customerId) {
            await updateCashIOReport(storeId, deletedTransaction, 'orderedTransactions', deletedTransaction.customerId, -1);
        }
        
        // Log the deletion
        await logActivity({
            type: 'CashIO',
            action: 'Deleted',
            details: `Transaction (Ref: ${deletedTransaction.reference}) for "${deletedTransaction.accountName}" was deleted.`,
            targetId: id,
            ...user,
        });
    }

    revalidatePath('/admin/cashio');
    revalidatePath('/admin/accounts');
    revalidatePath('/admin/activity-logs');
    revalidatePath('/admin/reports/cashio');
}

export async function deleteReceiptImageAction(storeId: string, transactionId: string, user: { userId: string, userName:string }) {
  const transaction = await getCashTransactionById(storeId, transactionId);
  if (!transaction || !transaction.receiptImageUrl) {
    throw new Error("No receipt image found for this transaction.");
  }

  await deleteReceiptImage(storeId, transactionId, transaction.receiptImageUrl);

  await logActivity({
    type: 'CashIO',
    action: 'Updated',
    details: `Receipt image for transaction Ref: ${transaction.reference} was deleted.`,
    targetId: transactionId,
    ...user,
  });
  
  revalidatePath(`/admin/cashio/edit/${transactionId}`);
  revalidatePath('/admin/activity-logs');
}

const collectionSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    value: z.string().min(1, 'Value is required'),
    customerId: z.string().min(1, 'Customer is required'),
    note: z.string().optional(),
});

export async function addCollectionAction(storeId: string, data: FormData) {
    const user = getUserFromFormData(data);
    const rawData = Object.fromEntries(data.entries());

    const validatedFields = collectionSchema.safeParse(rawData);
    if (!validatedFields.success) {
        throw new Error('Invalid collection data.');
    }

    const newCollection = await addCollection(storeId, validatedFields.data, user);
    await logActivity({
        type: 'Collection',
        action: 'Created',
        details: `Collection "${newCollection.name}" was created.`,
        targetId: newCollection.id,
        ...user,
    });
    
    revalidatePath('/admin/collections');
    revalidatePath('/admin/activity-logs');
}

export async function updateCollectionAction(storeId: string, id: string, data: FormData) {
    const user = getUserFromFormData(data);
    const rawData = Object.fromEntries(data.entries());
    
    const validatedFields = collectionSchema.safeParse(rawData);
    if (!validatedFields.success) {
        throw new Error('Invalid collection data.');
    }

    await updateCollection(storeId, { id, ...validatedFields.data }, user);
    await logActivity({
        type: 'Collection',
        action: 'Updated',
        details: `Collection "${validatedFields.data.name}" was updated.`,
        targetId: id,
        ...user,
    });

    revalidatePath('/admin/collections');
    revalidatePath(`/admin/collections/edit/${id}`);
    revalidatePath('/admin/activity-logs');
}

export async function deleteCollectionAction(storeId: string, id: string, user: { userId: string, userName: string }) {
    const deletedCollection = await deleteCollection(storeId, id);
    if (deletedCollection) {
        await logActivity({
            type: 'Collection',
            action: 'Deleted',
            details: `Collection "${deletedCollection.name}" was deleted.`,
            targetId: id,
            ...user,
        });
    }

    revalidatePath('/admin/collections');
    revalidatePath('/admin/activity-logs');
}

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  category: z.string().min(1, 'Category is required.'),
  date: z.string().min(1, 'Date is required.'),
  notes: z.string().optional(),
});

export async function addExpenseAction(storeId: string, data: FormData) {
  const user = getUserFromFormData(data);
  const rawData = Object.fromEntries(data.entries());
  
  const validatedFields = expenseSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error('Invalid expense data.');
  }

  const newExpense = await addExpense(storeId, validatedFields.data, user);

  await logActivity({
    type: 'Expense',
    action: 'Created',
    details: `Expense "${newExpense.description}" for ₱${newExpense.amount.toFixed(2)} was recorded.`,
    targetId: newExpense.id,
    ...user,
  });

  revalidatePath('/admin/expenses');
  revalidatePath('/admin/activity-logs');
}

export async function updateExpenseAction(storeId: string, id: string, data: FormData) {
  const user = getUserFromFormData(data);
  const rawData = Object.fromEntries(data.entries());

  const validatedFields = expenseSchema.safeParse(rawData);
  if (!validatedFields.success) {
    throw new Error('Invalid expense data.');
  }

  await updateExpense(storeId, id, validatedFields.data, user);

  await logActivity({
    type: 'Expense',
    action: 'Updated',
    details: `Expense "${validatedFields.data.description}" was updated.`,
    targetId: id,
    ...user,
  });

  revalidatePath('/admin/expenses');
  revalidatePath(`/admin/expenses/edit/${id}`);
  revalidatePath('/admin/activity-logs');
}

export async function deleteExpenseAction(storeId: string, id: string, user: { userId: string, userName: string }) {
    const deletedExpense = await deleteExpense(storeId, id);
    if (deletedExpense) {
        await logActivity({
            type: 'Expense',
            action: 'Deleted',
            details: `Expense "${deletedExpense.description}" was deleted.`,
            targetId: id,
            ...user,
        });
    }

    revalidatePath('/admin/expenses');
    revalidatePath('/admin/activity-logs');
}


const feeThresholdSchema = z.object({
  from: z.coerce.number().min(0),
  to: z.coerce.number().min(0),
  fee: z.coerce.number().min(0),
  type: z.enum(['fixed', 'per_thousand_flat']),
  notes: z.string().optional(),
});

export async function addFeeThresholdAction(storeId: string, data: FormData) {
    const user = getUserFromFormData(data);
    const rawData = Object.fromEntries(data.entries());

    const validatedFields = feeThresholdSchema.safeParse(rawData);
    if (!validatedFields.success) {
        throw new Error('Invalid fee threshold data.');
    }

    const newThreshold = await addFeeThreshold(storeId, validatedFields.data, user);
    await logActivity({
        type: 'FeeThreshold',
        action: 'Created',
        details: `Fee threshold from ₱${newThreshold.from} to ₱${newThreshold.to} was created.`,
        targetId: newThreshold.id,
        ...user,
    });
    
    revalidatePath('/admin/cashio-fees');
    revalidatePath('/admin/activity-logs');
}

export async function updateFeeThresholdAction(storeId: string, id: string, data: FormData) {
    const user = getUserFromFormData(data);
    const rawData = Object.fromEntries(data.entries());
    
    const validatedFields = feeThresholdSchema.safeParse(rawData);
    if (!validatedFields.success) {
        throw new Error('Invalid fee threshold data.');
    }

    await updateFeeThreshold(storeId, id, validatedFields.data, user);
    await logActivity({
        type: 'FeeThreshold',
        action: 'Updated',
        details: `Fee threshold was updated for range ₱${validatedFields.data.from} to ₱${validatedFields.data.to}.`,
        targetId: id,
        ...user,
    });

    revalidatePath('/admin/cashio-fees');
    revalidatePath('/admin/activity-logs');
}

export async function deleteFeeThresholdAction(storeId: string, id: string, user: { userId: string, userName: string }) {
    await deleteFeeThreshold(storeId, id);
    await logActivity({
        type: 'FeeThreshold',
        action: 'Deleted',
        details: 'A fee threshold was deleted.',
        targetId: id,
        ...user,
    });

    revalidatePath('/admin/cashio-fees');
    revalidatePath('/admin/activity-logs');
}

const printingPriceSchema = z.object({
    service: z.string().min(1, 'Service is required'),
    size: z.string().min(1, 'Size is required'),
    type: z.enum(['Color', 'Black & White', 'N/A']),
    price: z.coerce.number().min(0, 'Price must be a non-negative number'),
    notes: z.string().optional(),
});

export async function addPrintingPriceAction(storeId: string, data: FormData) {
    const user = getUserFromFormData(data);
    const rawData = Object.fromEntries(data.entries());

    const validatedFields = printingPriceSchema.safeParse(rawData);
    if (!validatedFields.success) {
        throw new Error('Invalid printing price data.');
    }

    const newPrice = await addPrintingPrice(storeId, validatedFields.data as Omit<PrintingPrice, 'id'>, user);
    await logActivity({
        type: 'PrintingPrice',
        action: 'Created',
        details: `Printing price for ${newPrice.service} (${newPrice.size}) was created.`,
        targetId: newPrice.id,
        ...user,
    });
    
    revalidatePath('/admin/printing/prices');
    revalidatePath('/admin/activity-logs');
}

export async function updatePrintingPriceAction(storeId: string, id: string, data: FormData) {
    const user = getUserFromFormData(data);
    const rawData = Object.fromEntries(data.entries());
    
    const validatedFields = printingPriceSchema.safeParse(rawData);
    if (!validatedFields.success) {
        throw new Error('Invalid printing price data.');
    }

    await updatePrintingPrice(storeId, id, validatedFields.data, user);
    await logActivity({
        type: 'PrintingPrice',
        action: 'Updated',
        details: `Printing price for ${validatedFields.data.service} (${validatedFields.data.size}) was updated.`,
        targetId: id,
        ...user,
    });

    revalidatePath('/admin/printing/prices');
    revalidatePath('/admin/activity-logs');
}

export async function deletePrintingPriceAction(storeId: string, id: string, user: { userId: string, userName: string }) {
    await deletePrintingPrice(storeId, id);
    await logActivity({
        type: 'PrintingPrice',
        action: 'Deleted',
        details: 'A printing price was deleted.',
        targetId: id,
        ...user,
    });

    revalidatePath('/admin/printing/prices');
    revalidatePath('/admin/activity-logs');
}


export async function regenerateCashIOReportsAction(storeId: string, user: { userId: string; userName: string }) {
    const actor = await getUserById(user.userId);
    if (!actor || actor.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can regenerate reports.');
    }
    await regenerateCashIOReports(storeId);
    await logActivity({
        type: 'System',
        action: 'Updated',
        details: 'CashIO reports were regenerated for all periods.',
        targetId: 'cashIOReports',
        ...user,
    });

    revalidatePath('/admin/reports/cashio');
    revalidatePath('/admin/activity-logs');
}

// ==================
// Store Management Actions
// ==================

const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createStoreAction(storeName: string, user: { userId: string; userName: string }) {
    const userRef = ref(db, `users/${user.userId}`);
    const userSnap = await get(userRef);
    if (!userSnap.exists()) {
        throw new Error("User creating store not found.");
    }
    const appUser = { id: user.userId, ...userSnap.val() };

    const newStoreRef = push(ref(db, 'stores'));
    const joinCode = generateJoinCode();
    const newStore: Omit<Store, 'id'> = {
        name: storeName,
        ownerId: user.userId,
        ownerName: user.userName,
        joinCode: joinCode,
        createdBy: { ...user, timestamp: getCurrentPHTISOString() },
    };
    await set(newStoreRef, newStore);
    const newStoreId = newStoreRef.key!;

    // Add owner as a member
    const memberRef = ref(db, `storeMembers/${newStoreId}/${user.userId}`);
    await set(memberRef, {
        name: appUser.name,
        email: appUser.email,
        status: 'approved',
        role: 'owner',
    });

    // Add default "N/A" account
    await addAccount(newStoreId, {
        accountName: 'N/A',
        bankName: 'N/A',
        accountNumber: 'N/A',
        balance: 0,
    }, user);

    // Set as active store for the user
    await update(userRef, { activeStoreId: newStoreId });

    await logActivity({
        type: 'Store',
        action: 'Created',
        details: `Store "${storeName}" was created.`,
        targetId: newStoreId,
        ...user
    });

    revalidatePath('/admin/stores');
    revalidatePath('/admin');
    revalidatePath('/admin/activity-logs');
}

export async function joinStoreAction(joinCode: string, user: { id: string; name: string; email: string; }) {
    const storesRef = ref(db, 'stores');
    const q = query(storesRef, orderByChild('joinCode'), equalTo(joinCode));
    const snapshot = await get(q);

    if (!snapshot.exists()) {
        throw new Error('Invalid join code.');
    }

    const storeId = Object.keys(snapshot.val())[0];
    const storeData = Object.values(snapshot.val())[0] as Store;

    // Check if user is already a member
    const memberRef = ref(db, `storeMembers/${storeId}/${user.id}`);
    const memberSnap = await get(memberRef);
    if (memberSnap.exists()) {
        const memberData = memberSnap.val();
        if(memberData.status === 'pending') {
            throw new Error('You have already requested to join this store.');
        } else if (memberData.status === 'approved') {
            throw new Error('You are already a member of this store.');
        }
    }

    await set(memberRef, {
        name: user.name,
        email: user.email,
        status: 'pending',
        role: 'member',
    });

    await logActivity({
        type: 'StoreMember',
        action: 'Created',
        details: `User "${user.name}" requested to join store "${storeData.name}".`,
        targetId: storeId,
        userId: user.id,
        userName: user.name,
    });

    revalidatePath('/admin/stores');
    revalidatePath('/admin/activity-logs');
}

export async function approveMemberAction(storeId: string, memberId: string, user: { userId: string; userName: string; }) {
    const storeRef = ref(db, `stores/${storeId}`);
    const storeSnap = await get(storeRef);
    if (!storeSnap.exists() || storeSnap.val().ownerId !== user.userId) {
        throw new Error("You are not the owner of this store.");
    }
    const storeData = storeSnap.val();

    const memberRef = ref(db, `storeMembers/${storeId}/${memberId}`);
    const memberSnap = await get(memberRef);
    if (!memberSnap.exists()) {
        throw new Error("Member not found.");
    }

    await update(memberRef, { status: 'approved' });

    await logActivity({
        type: 'StoreMember',
        action: 'Updated',
        details: `Membership for "${memberSnap.val().name}" was approved in store "${storeData.name}".`,
        targetId: storeId,
        ...user,
    });

    revalidatePath('/admin/stores');
    revalidatePath('/admin/activity-logs');
}
