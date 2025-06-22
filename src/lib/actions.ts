'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addProduct, deleteProduct, updateProduct, addCustomer, addAccount, deleteAccount, addCollection, updateCollection, deleteCollection, addCashTransaction, logActivity, updateCashTransactionStatus, updateCustomerBalance } from './data';
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

const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  customerName: z.string().min(1),
  items: z.array(z.any()),
  subtotal: z.number(),
  discount: z.number().min(0),
  total: z.number(),
});


export async function createOrderAction(order: z.infer<typeof orderSchema>) {
    const validatedOrder = orderSchema.safeParse(order);
    if (!validatedOrder.success) {
        throw new Error('Invalid order data.');
    }

    // In a real app, you would save this to a database,
    // process payment, send emails, etc.
    console.log('New Order Created:', validatedOrder.data);

    // Fake order ID for logging
    const orderId = `order-${Date.now()}`;
    await logActivity({
        type: 'Order',
        action: 'Created',
        details: `New order placed for ${validatedOrder.data.customerName} for ₱${validatedOrder.data.total.toFixed(2)}.`,
        targetId: orderId,
    });

    // Simulate some async work
    await new Promise(res => setTimeout(res, 1000));
    revalidatePath('/admin/transactions');
}

const orderWithBalanceSchema = orderSchema.extend({
    balanceChange: z.number(),
});

export async function createOrderAndUpdateBalanceAction(order: z.infer<typeof orderWithBalanceSchema>) {
    const validatedOrder = orderWithBalanceSchema.safeParse(order);
    if (!validatedOrder.success) {
        throw new Error('Invalid order data for balance update.');
    }
    const { customerId, balanceChange, customerName } = validatedOrder.data;

    // Create order log first
    await createOrderAction(order);
    
    // Update customer's balance
    await updateCustomerBalance(customerId, balanceChange);
    
    // Log the balance update
    await logActivity({
        type: 'Customer',
        action: 'Updated',
        details: `Balance for ${customerName} updated by ₱${balanceChange.toFixed(2)} from an order.`,
        targetId: customerId,
    });
    
    revalidatePath('/admin/customers');
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
  revalidatePath('/admin/transactions');
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
  revalidatePath('/admin/transactions');
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
    revalidatePath('/admin/transactions');
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

export async function addCashTransactionAction(data: FormData) {
  const validatedFields = cashTransactionSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid cash transaction data.');
  }

  // We don't pass newBalance to addCashTransaction, it calculates it.
  const newTransaction = await addCashTransaction(validatedFields.data);

  await logActivity({
    type: 'CashIO',
    action: 'Created',
    details: `${newTransaction.transactionType} of ₱${newTransaction.amount.toFixed(2)} for "${newTransaction.customerName}" was recorded.`,
    targetId: newTransaction.id,
  });

  revalidatePath('/admin/cashio');
  revalidatePath('/admin/transactions');
  revalidatePath('/admin/accounts'); // because balance changes
}

export async function updateCashTransactionStatusAction(id: string) {
  const updatedTransaction = await updateCashTransactionStatus(id);
  
  if (updatedTransaction) {
    await logActivity({
      type: 'CashIO',
      action: 'Updated',
      details: `Transaction for "${updatedTransaction.customerName}" was marked as ${updatedTransaction.status}.`,
      targetId: id,
    });
  } else {
    throw new Error('Transaction is not available to be updated or not found.');
  }
  
  revalidatePath('/admin/cashio');
  revalidatePath('/admin/transactions');
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
    revalidatePath('/admin/transactions');
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
    revalidatePath('/admin/transactions');
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
    revalidatePath('/admin/transactions');
}
