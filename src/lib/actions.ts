
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addProduct, deleteProduct, updateProduct, addCustomer, addAccount, deleteAccount, addCollection, updateCollection, deleteCollection, addCashTransaction, logActivity, updateCashTransactionStatus, updateCustomerBalance, isReferenceNumberDuplicate, updateCashTransaction, addOrder, addExpense, updateExpense, deleteExpense, updateSalesReports, updateCashIOReport, updateCustomerReports } from './data';
import { Product, CartItem, Customer, Account, Collection, CashTransaction, Order } from './types';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  show: z.coerce.boolean(),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock: z.coerce.number().min(0, 'Stock must be positive'),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  image: z.string().url('Image must be a valid URL').or(z.literal('')).optional(),
  unit: z.enum(['each', 'kg']),
});

export async function addProductAction(data: FormData) {
  const validatedFields = productSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid product data.');
  }

  const newProduct = await addProduct(validatedFields.data);
  
  await logActivity({
    type: 'Product',
    action: 'Created',
    details: `Product "${newProduct.name}" was created.`,
    targetId: newProduct.id,
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath('/admin/activity-logs');
}

export async function updateProductAction(id: string, data: FormData) {
  const validatedFields = productSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid product data.');
  }

  const product: Product = { id, ...validatedFields.data };
  await updateProduct(product);

  await logActivity({
      type: 'Product',
      action: 'Updated',
      details: `Product "${product.name}" was updated.`,
      targetId: product.id,
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath(`/admin/edit/${id}`);
  revalidatePath('/admin/activity-logs');
}

export async function deleteProductAction(id: string) {
  const deletedProduct = await deleteProduct(id);
  if (deletedProduct) {
    await logActivity({
        type: 'Product',
        action: 'Deleted',
        details: `Product "${deletedProduct.name}" was deleted.`,
        targetId: id,
    });
  }

  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
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
});

export async function processOrderAction(orderData: z.infer<typeof processOrderSchema>) {
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
    } = validatedOrder.data;

    for (const item of items) {
        if (item.category === 'CashIO' && item.originalTransactionId) {
            const updatedTransaction = await updateCashTransactionStatus(item.originalTransactionId, customerId);
            if (updatedTransaction) {
                 await logActivity({
                    type: 'CashIO',
                    action: 'Updated',
                    details: `Transaction for "${customerName}" was marked as ${updatedTransaction.status} via checkout.`,
                    targetId: item.originalTransactionId,
                });
                await updateCashIOReport(updatedTransaction, 'orderedTransactions', customerId);
            }
        }
    }

    const isUnknownCustomer = customerId === 'unknown';
    
    // Correctly calculate the total change to the customer's balance.
    // 1. Balance Used: If applyCustomerBalance is true, this is how much of their credit is used.
    const balanceUsed = applyCustomerBalance && !isUnknownCustomer ? initialCustomerBalance : 0;
    
    // 2. Change to Balance: If settling to balance, this is the amount tendered minus the total. Can be positive (change) or negative (debt).
    // If just paying, this is 0.
    const changeToBalance = settlementType === 'add_to_balance' ? (amountTendered - total) : 0;
    
    // 3. Total Balance Update: The net effect on the customer's balance.
    const totalBalanceUpdate = changeToBalance - balanceUsed;
    
    const orderPayload: Omit<Order, 'id'> = {
        customerId,
        customerName,
        items,
        subtotal,
        discount,
        total,
        amountTendered,
        settlementType,
        applyCustomerBalance,
        createdAt: '', // Will be set by addOrder
    };

    if (!isUnknownCustomer) {
        const newCustomerBalance = initialCustomerBalance + totalBalanceUpdate;
        orderPayload.initialCustomerBalance = initialCustomerBalance;
        orderPayload.newCustomerBalance = newCustomerBalance;
    }


    const newOrder = await addOrder(orderPayload);

    // Log the order creation
    await logActivity({
        type: 'Order',
        action: 'Created',
        details: `New order placed for ${customerName} for ₱${total.toFixed(2)}.`,
        targetId: newOrder.id,
    });
    
    await updateSalesReports(newOrder);

    // This will now handle both known and unknown customers and pass the total.
    const orderValueForReport = Math.abs(total);
    await updateCustomerReports('order', customerId, orderValueForReport);

    if (!isUnknownCustomer) {
        if (totalBalanceUpdate !== 0) {
            await updateCustomerBalance(customerId, totalBalanceUpdate);
            await logActivity({
                type: 'Customer',
                action: 'Updated',
                details: `Balance for ${customerName} updated by ₱${totalBalanceUpdate.toFixed(2)} from an order.`,
                targetId: customerId,
            });
        }
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


export async function addCustomerAction(data: FormData): Promise<Customer> {
  const validatedFields = customerSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid customer data.');
  }

  const newCustomer = await addCustomer(validatedFields.data as Omit<Customer, 'id'>);
  await logActivity({
    type: 'Customer',
    action: 'Created',
    details: `Customer "${newCustomer.name}" was added.`,
    targetId: newCustomer.id,
  });
  
  await updateCustomerReports('new_customer', newCustomer.id);

  revalidatePath('/admin/customers');
  revalidatePath('/admin/activity-logs');
  return newCustomer;
}

export async function updateCustomerBalanceAction(customerId: string, amount: number) {
    if (!customerId || customerId === 'unknown') {
        throw new Error('Cannot update balance for an unknown customer.');
    }
    
    if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
        throw new Error('Invalid amount provided.');
    }

    const updatedCustomer = await updateCustomerBalance(customerId, amount);

    if (!updatedCustomer) {
        throw new Error('Customer not found.');
    }
    
    const actionType = amount > 0 ? 'added to' : 'paid from';
    const absAmount = Math.abs(amount).toFixed(2);

    await logActivity({
        type: 'Customer',
        action: 'Updated',
        details: `₱${absAmount} was ${actionType} ${updatedCustomer.name}'s balance.`,
        targetId: customerId,
    });

    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath('/admin/customers');
    revalidatePath('/admin/activity-logs');
}

const accountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  balance: z.coerce.number().default(0),
});

export async function addAccountAction(data: FormData) {
  const validatedFields = accountSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid account data.');
  }

  const newAccount = await addAccount(validatedFields.data as Omit<Account, 'id'>);
  await logActivity({
      type: 'Account',
      action: 'Created',
      details: `Account "${newAccount.accountName}" was created.`,
      targetId: newAccount.id,
  });

  revalidatePath('/admin/accounts');
  revalidatePath('/admin/cashio');
  revalidatePath('/admin/activity-logs');
}

export async function deleteAccountAction(id: string) {
    const deletedAccount = await deleteAccount(id);
    if(deletedAccount) {
        await logActivity({
            type: 'Account',
            action: 'Deleted',
            details: `Account "${deletedAccount.accountName}" was deleted.`,
            targetId: id,
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
  status: z.enum(['Delivered', 'Available', 'Claimed']),
  accountName: z.string().min(1, "Sender/Receiver's account name is required."),
  accountNumber: z.string().min(1, "Sender/Receiver's account number is required."),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  fee: z.coerce.number().min(0, 'Fee cannot be negative.'),
  reference: z.string().min(1, 'Reference is required.'),
  message: z.string().optional().default(''),
  datetime: z.string().optional(),
});

export async function addCashTransactionAction(data: FormData): Promise<CashTransaction> {
  const validatedFields = cashTransactionSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid cash transaction data.');
  }

  const isDuplicate = await isReferenceNumberDuplicate(validatedFields.data.reference);
  if (isDuplicate) {
    throw new Error('DUPLICATE_REFERENCE');
  }

  const newTransaction = await addCashTransaction(validatedFields.data);

  await logActivity({
    type: 'CashIO',
    action: 'Created',
    details: `${newTransaction.transactionType} of ₱${newTransaction.amount.toFixed(2)} for "${validatedFields.data.accountName}" was recorded.`,
    targetId: newTransaction.id,
  });
  
  await updateCashIOReport(newTransaction, 'allTransactions');

  revalidatePath('/admin/cashio');
  revalidatePath('/admin/activity-logs');
  revalidatePath('/admin/accounts');
  
  return newTransaction;
}

export async function updateCashTransactionAction(id: string, data: FormData) {
  const validatedFields = cashTransactionSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid cash transaction data.');
  }

  const updatedTransaction = await updateCashTransaction(id, validatedFields.data);

  await logActivity({
    type: 'CashIO',
    action: 'Updated',
    details: `Transaction for "${updatedTransaction.accountName}" was updated.`,
    targetId: updatedTransaction.id,
  });

  revalidatePath('/admin/cashio');
  revalidatePath(`/admin/cashio/edit/${id}`);
  revalidatePath('/admin/activity-logs');
}

const collectionSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    value: z.string().min(1, 'Value is required'),
    customerId: z.string().min(1, 'Customer is required'),
    note: z.string().optional(),
});

export async function addCollectionAction(data: FormData) {
    const validatedFields = collectionSchema.safeParse(Object.fromEntries(data.entries()));

    if (!validatedFields.success) {
        throw new Error('Invalid collection data.');
    }

    const newCollection = await addCollection(validatedFields.data);
    await logActivity({
        type: 'Collection',
        action: 'Created',
        details: `Collection "${newCollection.name}" was created.`,
        targetId: newCollection.id,
    });
    
    revalidatePath('/admin/collections');
    revalidatePath('/admin/activity-logs');
}

export async function updateCollectionAction(id: string, data: FormData) {
    const validatedFields = collectionSchema.safeParse(Object.fromEntries(data.entries()));

    if (!validatedFields.success) {
        throw new Error('Invalid collection data.');
    }

    await updateCollection({ id, ...validatedFields.data });
    await logActivity({
        type: 'Collection',
        action: 'Updated',
        details: `Collection "${validatedFields.data.name}" was updated.`,
        targetId: id,
    });

    revalidatePath('/admin/collections');
    revalidatePath(`/admin/collections/edit/${id}`);
    revalidatePath('/admin/activity-logs');
}

export async function deleteCollectionAction(id: string) {
    const deletedCollection = await deleteCollection(id);
    if (deletedCollection) {
        await logActivity({
            type: 'Collection',
            action: 'Deleted',
            details: `Collection "${deletedCollection.name}" was deleted.`,
            targetId: id,
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

export async function addExpenseAction(data: FormData) {
  const validatedFields = expenseSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid expense data.');
  }

  const newExpense = await addExpense(validatedFields.data);

  await logActivity({
    type: 'Expense',
    action: 'Created',
    details: `Expense "${newExpense.description}" for ₱${newExpense.amount.toFixed(2)} was recorded.`,
    targetId: newExpense.id,
  });

  revalidatePath('/admin/expenses');
  revalidatePath('/admin/activity-logs');
}

export async function updateExpenseAction(id: string, data: FormData) {
  const validatedFields = expenseSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid expense data.');
  }

  await updateExpense(id, validatedFields.data);

  await logActivity({
    type: 'Expense',
    action: 'Updated',
    details: `Expense "${validatedFields.data.description}" was updated.`,
    targetId: id,
  });

  revalidatePath('/admin/expenses');
  revalidatePath(`/admin/expenses/edit/${id}`);
  revalidatePath('/admin/activity-logs');
}

export async function deleteExpenseAction(id: string) {
    const deletedExpense = await deleteExpense(id);
    if (deletedExpense) {
        await logActivity({
            type: 'Expense',
            action: 'Deleted',
            details: `Expense "${deletedExpense.description}" was deleted.`,
            targetId: id,
        });
    }

    revalidatePath('/admin/expenses');
    revalidatePath('/admin/activity-logs');
}
    

    
