
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addProduct, deleteProduct, updateProduct, addCustomer, addAccount, deleteAccount, addCollection, updateCollection, deleteCollection, addCashTransaction, logActivity, updateCashTransactionStatus, updateCustomerBalance, isReferenceNumberDuplicate, updateCashTransaction, addOrder } from './data';
import { Product, CartItem, Customer, Account, Collection, CashTransaction } from './types';

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
  revalidatePath('/admin/transactions');
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
  revalidatePath(`/admin/products/edit/${id}`);
  revalidatePath('/admin/transactions');
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
  revalidatePath('/admin/transactions');
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
            const updatedTransaction = await updateCashTransactionStatus(item.originalTransactionId, customerId, customerName);
            if (updatedTransaction) {
                 await logActivity({
                    type: 'CashIO',
                    action: 'Updated',
                    details: `Transaction for "${updatedTransaction.customerName}" was marked as ${updatedTransaction.status} via checkout.`,
                    targetId: item.originalTransactionId,
                });
            }
        }
    }

    const newOrder = await addOrder({
        customerId: customerId,
        customerName: customerName,
        items: items,
        subtotal: subtotal,
        discount: discount,
        total: total,
        amountTendered: amountTendered,
        settlementType: settlementType,
        createdAt: '', // Will be set by addOrder
    });

    // Log the order creation
    await logActivity({
        type: 'Order',
        action: 'Created',
        details: `New order placed for ${customerName} for ₱${total.toFixed(2)}.`,
        targetId: newOrder.id,
    });

    if (customerId !== 'unknown') {
        let totalBalanceUpdate = 0;
        
        if (settlementType === 'pay_order') {
            // For simple payments, balance is only affected if customer balance was applied.
            // Any change due is handled physically, not stored as balance.
            if (applyCustomerBalance) {
                totalBalanceUpdate -= initialCustomerBalance;
            }
        } else if (settlementType === 'add_to_balance') {
            // For "Add to Balance", the entire difference is applied.
            let balanceChangeFromTender = total - amountTendered;
            if (total < 0) {
                balanceChangeFromTender = 0;
            }
            totalBalanceUpdate += balanceChangeFromTender;
            
            if (applyCustomerBalance) {
                totalBalanceUpdate -= initialCustomerBalance;
            }
        }

        if (totalBalanceUpdate !== 0) {
            await updateCustomerBalance(customerId, totalBalanceUpdate);
            await logActivity({
                type: 'Customer',
                action: 'Updated',
                details: `Balance for ${customerName} updated by ₱${totalBalanceUpdate.toFixed(2)} from an order.`,
                targetId: customerId,
            });
        }
        revalidatePath('/admin/customers');
    }
    
    revalidatePath('/admin/activity-logs');
    revalidatePath('/admin/cashio');
    revalidatePath('/admin/orders');
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


export async function addCustomerAction(data: FormData) {
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
  customerName: z.string().min(1, 'Customer name is required.'),
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
    details: `${newTransaction.transactionType} of ₱${newTransaction.amount.toFixed(2)} for "${newTransaction.customerName}" was recorded.`,
    targetId: newTransaction.id,
  });

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
    details: `Transaction for "${updatedTransaction.customerName}" was updated.`,
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
