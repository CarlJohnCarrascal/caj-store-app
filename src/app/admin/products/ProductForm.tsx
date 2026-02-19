
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
import { addProductAction, updateProductAction } from '@/lib/actions';
import { Bot, ImageIcon, ScanBarcode } from 'lucide-react';
import { useState, useTransition } from 'react';
import { generateProductDescription } from '@/ai/flows/generate-product-description';
import { generateProductImage } from '@/ai/flows/generate-product-image';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BarcodeScanner from '@/components/BarcodeScanner';
import { addProduct, updateProduct, isBarcodeDuplicate, logActivity } from '@/lib/data';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  show: z.boolean().default(true),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
  cost: z.coerce.number().min(0, 'Cost cannot be negative').optional(),
  stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  criticalStockThreshold: z.coerce.number().min(0).optional(),
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
  storeId: string;
}

export default function ProductForm({ product, storeId }: ProductFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product
      ? { 
          ...product,
          price: Number(product.price), 
          stock: Number(product.stock),
          cost: product.cost ?? 0,
          lowStockThreshold: product.lowStockThreshold ?? 10,
          criticalStockThreshold: product.criticalStockThreshold ?? 5,
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
          show: true,
          category: '',
          price: 0,
          cost: 0,
          stock: 0,
          lowStockThreshold: 10,
          criticalStockThreshold: 5,
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
    if (!storeId) {
        toast({ variant: 'destructive', title: 'Store not selected', description: 'Please select a store first.' });
        return;
    }
    startTransition(async () => {
      try {
        const userPayload = { userId: user.uid, userName: user.displayName || user.email! };
        
        if (data.barcode) {
          const isDuplicate = await isBarcodeDuplicate(storeId, data.barcode, product?.id);
          if (isDuplicate) {
            throw new Error(`Barcode "${data.barcode}" is already assigned to another product.`);
          }
        }
        
        if (product && product.id) {
          await updateProduct(storeId, {id: product.id, ...data}, userPayload);
          await logActivity({
              type: 'Product',
              action: 'Updated',
              details: `Product "${data.name}" was updated.`,
              targetId: product.id,
              ...userPayload,
          });
          await updateProductAction(product.id);
          toast({ title: 'Success', description: 'Product updated successfully.' });

        } else {
          const newProduct = await addProduct(storeId, data, userPayload);
          await logActivity({
            type: 'Product',
            action: 'Created',
            details: `Product "${newProduct.name}" was created.`,
            targetId: newProduct.id,
            ...userPayload,
          });
          await addProductAction();
          toast({ title: 'Success', description: 'Product added successfully.' });
          form.reset();
        }

        router.push('/admin/products');
        router.refresh(); // Fallback refresh
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
  
  const onBarcodeScanned = (result: string) => {
    form.setValue('barcode', result, { shouldValidate: true });
    setIsScannerOpen(false);
    toast({ title: 'Barcode Scanned!', description: `Value: ${result}` });
  };

  return (
    <>
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
                      <FormLabel>Price</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g. 299.99" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cost" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost (Optional)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g. 150.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="stock" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Stock</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g. 50" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Stock At</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g. 10" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="criticalStockThreshold" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Critical At</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g. 5" {...field} /></FormControl>
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
                    <div className="flex gap-2">
                        <FormControl><Input placeholder="e.g. 123456789012" {...field} /></FormControl>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
                            <ScanBarcode className="h-4 w-4" />
                            <span className="sr-only">Scan Barcode</span>
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="show"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full">
                          <div className="space-y-0.5">
                            <FormLabel>Show in Store</FormLabel>
                            <FormDescription>
                              Visible to customers.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full">
                           <div className="space-y-0.5">
                              <FormLabel>Unit</FormLabel>
                              <FormDescription>
                                Sold by each or kg.
                              </FormDescription>
                            </div>
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
                </div>
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
    
    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner onResult={onBarcodeScanned} onCancel={() => setIsScannerOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
