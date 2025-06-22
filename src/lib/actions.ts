'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addProduct, deleteProduct, updateProduct, addCustomer, addAccount, deleteAccount, addCollection, updateCollection, deleteCollection } from './data';
import { Product, CartItem, Customer, Account, Collection } from './types';

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

  await addProduct(validatedFields.data);
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
}

export async function updateProductAction(id: string, data: FormData) {
  const validatedFields = productSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid product data.');
  }

  const product: Product = { id, ...validatedFields.data };
  await updateProduct(product);
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath(`/admin/products/edit/${id}`);
}

export async function deleteProductAction(id: string) {
  await deleteProduct(id);
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
}

const orderSchema = z.object({
  customer: z.object({
    name: z.string(),
    email: z.string().email(),
    address: z.string(),
    city: z.string(),
    zip: z.string(),
  }),
  items: z.array(z.any()),
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

    // Simulate some async work
    await new Promise(res => setTimeout(res, 1000));
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

  await addCustomer(validatedFields.data as Omit<Customer, 'id'>);
  revalidatePath('/admin/customers');
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

  await addAccount(validatedFields.data as Omit<Account, 'id'>);
  revalidatePath('/admin/accounts');
  revalidatePath('/admin/cashio');
}

export async function deleteAccountAction(id: string) {
    await deleteAccount(id);
    revalidatePath('/admin/accounts');
    revalidatePath('/admin/cashio');
}


const collectionSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    value: z.coerce.number().positive('Value must be a positive number'),
    customerId: z.string().min(1, 'Customer is required'),
    note: z.string().optional(),
});

export async function addCollectionAction(data: FormData) {
    const validatedFields = collectionSchema.safeParse(Object.fromEntries(data.entries()));

    if (!validatedFields.success) {
        throw new Error('Invalid collection data.');
    }

    await addCollection(validatedFields.data);
    revalidatePath('/admin/collections');
}

export async function updateCollectionAction(id: string, data: FormData) {
    const validatedFields = collectionSchema.safeParse(Object.fromEntries(data.entries()));

    if (!validatedFields.success) {
        throw new Error('Invalid collection data.');
    }

    await updateCollection({ id, ...validatedFields.data });
    revalidatePath('/admin/collections');
    revalidatePath(`/admin/collections/edit/${id}`);
}

export async function deleteCollectionAction(id: string) {
    await deleteCollection(id);
    revalidatePath('/admin/collections');
}
