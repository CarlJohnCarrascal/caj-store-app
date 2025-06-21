'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addProduct, deleteProduct, updateProduct } from './data';
import { Product, CartItem } from './types';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  show: z.coerce.boolean(),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock: z.coerce.number().min(0, 'Stock must be positive'),
  material: z.string().min(1, 'Material is required'),
  dimensions: z.string().min(1, 'Dimensions are required'),
  description: z.string().min(1, 'Description is required'),
  image: z.string().url('Must be a valid URL'),
});

export async function addProductAction(data: FormData) {
  const validatedFields = productSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid product data.');
  }

  await addProduct(validatedFields.data);
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function updateProductAction(id: string, data: FormData) {
  const validatedFields = productSchema.safeParse(Object.fromEntries(data.entries()));

  if (!validatedFields.success) {
    throw new Error('Invalid product data.');
  }

  const product: Product = { id, ...validatedFields.data };
  await updateProduct(product);
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath(`/admin/edit/${id}`);
}

export async function deleteProductAction(id: string) {
  await deleteProduct(id);
  revalidatePath('/admin');
  revalidatePath('/');
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
