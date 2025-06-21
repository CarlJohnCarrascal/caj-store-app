'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addProductAction, updateProductAction } from '@/lib/actions';
import { Bot } from 'lucide-react';
import { useState, useTransition } from 'react';
import { generateProductDescription } from '@/ai/flows/generate-product-description';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  material: z.string().min(1, 'Material is required'),
  dimensions: z.string().min(1, 'Dimensions are required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  image: z.string().url('Image must be a valid URL'),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product?: Product;
}

export default function ProductForm({ product }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product
      ? { ...product, price: Number(product.price), stock: Number(product.stock) }
      : {
          name: '',
          category: '',
          price: 0,
          stock: 0,
          material: '',
          dimensions: '',
          description: '',
          image: '',
        },
  });

  const onSubmit = (data: ProductFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, String(value));
        });

        if (product) {
          await updateProductAction(product.id, formData);
          toast({ title: 'Success', description: 'Product updated successfully.' });
        } else {
          await addProductAction(formData);
          toast({ title: 'Success', description: 'Product added successfully.' });
          form.reset();
        }
        router.push('/admin');
        router.refresh();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
      }
    });
  };
  
  const handleGenerateDescription = async () => {
      const { name, category, material, dimensions } = form.getValues();
      if (!name || !category || !material || !dimensions) {
          toast({
              variant: 'destructive',
              title: 'Missing Details',
              description: 'Please fill in Name, Category, Material, and Dimensions to generate a description.',
          });
          return;
      }
      setIsGenerating(true);
      try {
          const result = await generateProductDescription({ name, category, material, dimensions });
          if(result.description) {
            form.setValue('description', result.description, { shouldValidate: true });
            toast({ title: 'Description Generated!', description: 'The AI-powered description has been added.' });
          } else {
            throw new Error("AI did not return a description.");
          }
      } catch (error) {
          toast({
              variant: 'destructive',
              title: 'Generation Failed',
              description: 'Could not generate a description. Please try again.',
          });
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? 'Edit Product' : 'Create Product'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Modern Sofa" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl><Input placeholder="e.g. Furniture" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g. 299.99" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stock" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 50" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="material" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material</FormLabel>
                        <FormControl><Input placeholder="e.g. Oak Wood" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="dimensions" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions</FormLabel>
                        <FormControl><Input placeholder='e.g. W: 80", D: 35", H: 30"' {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Description</FormLabel>
                       <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGenerating}>
                         <Bot className="mr-2 h-4 w-4" />
                         {isGenerating ? 'Generating...' : 'Generate with AI'}
                       </Button>
                    </div>
                    <FormControl><Textarea placeholder="Describe the product..." rows={8} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (product ? 'Saving...' : 'Adding...') : (product ? 'Save Changes' : 'Add Product')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
