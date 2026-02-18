
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { useTransition } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { updateProductStock } from '@/lib/data';
import { updateStockAction } from '@/lib/actions';

const formSchema = z.object({
  type: z.enum(['stock-in', 'stock-out', 'correction']),
  quantity: z.coerce.number().positive('Quantity must be a positive number'),
  notes: z.string().optional(),
  newPrice: z.coerce.number().optional(),
  newCost: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StockAdjustmentFormProps {
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StockAdjustmentForm({ product, onSuccess, onCancel }: StockAdjustmentFormProps) {
  const { toast } = useToast();
  const { user, activeStoreId } = useAuth();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'stock-in',
      quantity: undefined,
      notes: '',
      newPrice: product.price,
      newCost: product.cost,
    },
  });

  const adjustmentType = form.watch('type');
  const showPriceFields = product.stock <= 0 && adjustmentType === 'stock-in';

  const onSubmit = (data: FormValues) => {
    if (!user || !activeStoreId) {
      toast({ variant: 'destructive', title: 'Authentication Error' });
      return;
    }

    const quantityChange = data.type === 'stock-in' ? data.quantity : -data.quantity;

    startTransition(async () => {
      try {
        await updateProductStock(activeStoreId, product.id, {
          type: data.type,
          quantityChange,
          notes: data.notes,
          newPrice: showPriceFields ? data.newPrice : undefined,
          newCost: showPriceFields ? data.newCost : undefined,
        }, { userId: user.uid, userName: user.displayName || user.email! });
        
        await updateStockAction();

        toast({ title: 'Success', description: 'Stock updated successfully.' });
        onSuccess();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                    <FormLabel>Adjustment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="stock-in">Stock In</SelectItem>
                            <SelectItem value="stock-out">Stock Out</SelectItem>
                            <SelectItem value="correction">Correction</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        </div>
        {showPriceFields && (
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
            <FormField control={form.control} name="newPrice" render={({ field }) => (
                <FormItem>
                    <FormLabel>New Selling Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="newCost" render={({ field }) => (
                <FormItem>
                    <FormLabel>New Cost Price</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
          </div>
        )}
        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="e.g. Received new shipment, Damaged goods, etc." {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Adjustment"}</Button>
        </div>
      </form>
    </Form>
  );
}
