'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addPublicProductAction, updatePublicProductAction } from '@/lib/actions';
import { Bot, ImageIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { generateProductDescription } from '@/ai/flows/generate-product-description';
import { generateProductImage } from '@/ai/flows/generate-product-image';
import { useAuth } from '@/hooks/use-auth';
import { addPublicProduct, updatePublicProduct } from '@/lib/data/public-products';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
  cost: z.coerce.number().min(0, 'Cost cannot be negative').optional(),
  barcode: z.string().optional(),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url('Image must be a valid URL').or(z.literal('')).optional(),
  unit: z.enum(['each', 'kg']).default('each'),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  product?: Product;
}

export default function PublicProductForm({ product }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product
      ? { 
          ...product,
          price: Number(product.price),
          cost: product.cost ?? 0,
          unit: product.unit || 'each', 
          barcode: product.barcode || '',
          material: product.material || '',
          dimensions: product.dimensions || '',
          description: product.description || '',
          image: product.image || '',
        }
      : {
          name: '',
          group: '',
          category: '',
          price: 0,
          cost: 0,
          barcode: '',
          material: '',
          dimensions: '',
          description: '',
          image: '',
          unit: 'each',
        },
  });

  const onSubmit = (data: ProductFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }
    startTransition(async () => {
      try {
        const userPayload = { userId: user.uid, userName: user.displayName || user.email! };
        
        if (product && product.id) {
          const payload = { ...product, ...data };
          await updatePublicProduct(payload, userPayload);
          await updatePublicProductAction(product.id);
          toast({ title: 'Success', description: 'Public product updated successfully.' });

        } else {
          const newProductData: Omit<Product, 'id'> = {
            ...data,
            show: true,
            stock: 0,
          };
          await addPublicProduct(newProductData, userPayload);
          await addPublicProductAction();
          toast({ title: 'Success', description: 'Public product added successfully.' });
          form.reset();
        }

        router.push('/admin/public-products');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
      }
    });
  };
  
  const handleGenerateDescription = async () => {
      const { name, group, category, material, dimensions } = form.getValues();
      if (!name || !group || !category) {
          toast({
              variant: 'destructive',
              title: 'Missing Details',
              description: 'Please fill in Name, Group, and Category to generate a description.',
          });
          return;
      }
      setIsGeneratingDesc(true);
      try {
          const result = await generateProductDescription({ name, group, category, material: material || '', dimensions: dimensions || '' });
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
          setIsGeneratingDesc(false);
      }
  };
  
  const handleGenerateImage = async () => {
      const name = form.getValues('name');
      if (!name) {
          toast({
              variant: 'destructive',
              title: 'Product Name Needed',
              description: 'Please enter a product name to generate an image.',
          });
          return;
      }
      setIsGeneratingImage(true);
      try {
          const result = await generateProductImage({ description: name });
          if (result.imageUrl) {
              form.setValue('image', result.imageUrl, { shouldValidate: true });
              toast({ title: 'Image Generated!', description: 'The AI-powered image has been added.' });
          } else {
              throw new Error("AI did not return an image URL.");
          }
      } catch (error) {
          toast({
              variant: 'destructive',
              title: 'Image Generation Failed',
              description: 'Could not generate an image. Please try again.',
          });
      } finally {
          setIsGeneratingImage(false);
      }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? 'Edit Public Product' : 'Create Public Product'}</CardTitle>
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="group" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group</FormLabel>
                      <FormControl><Input placeholder="e.g. Seating" {...field} /></FormControl>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Price</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g. 299.99" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cost" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Cost (Optional)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g. 150.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <div className="flex gap-2">
                        <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                        <Button type="button" variant="outline" size="icon" onClick={handleGenerateImage} disabled={isGeneratingImage || isGeneratingDesc}>
                            {isGeneratingImage ? "..." : <ImageIcon className="h-4 w-4" />}
                            <span className="sr-only">Generate Image</span>
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="space-y-8">
                <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. 123456789012" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Unit</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex"
                              >
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl><RadioGroupItem value="each" /></FormControl>
                                  <FormLabel className="font-normal">Each</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl><RadioGroupItem value="kg" /></FormControl>
                                  <FormLabel className="font-normal">Kg</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                        </FormItem>
                      )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="material" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g. Oak Wood" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="dimensions" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions (Optional)</FormLabel>
                        <FormControl><Input placeholder='e.g. W: 80", D: 35", H: 30"' {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Description</FormLabel>
                       <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDesc || isGeneratingImage}>
                         <Bot className="mr-2 h-4 w-4" />
                         {isGeneratingDesc ? 'Generating...' : 'Generate with AI'}
                       </Button>
                    </div>
                    <FormControl><Textarea placeholder="Describe the product..." rows={5} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending || isGeneratingDesc || isGeneratingImage}>
                {isPending ? (product ? 'Saving...' : 'Adding...') : (product ? 'Save Changes' : 'Add Product')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
