'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addProduct, deleteProduct, updateProduct, addCustomer } from './data';
import { Product, CartItem, Customer } from './types';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  show: z.coerce.boolean(),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock: z.coerce.number().min(0, 'Stock must be positive'),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  image: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
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
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  location: z.string().min(1, 'Location is required'),
});


export async function addCustomerAction(data: FormData) {
  const validatedFields = customerSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid customer data.');
  }

  await addCustomer(validatedFields.data);
  revalidatePath('/admin/customers');
}
