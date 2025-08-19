
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PrintingPrice } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addPrintingPriceAction, updatePrintingPriceAction } from '@/lib/actions';
import { useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  service: z.string().min(1, 'Service is required'),
  size: z.string().min(1, 'Size is required'),
  type: z.enum(['Color', 'Black & White', 'N/A']),
  price: z.coerce.number().min(0, 'Price must be a non-negative number'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PrintingPriceFormProps {
  price?: PrintingPrice;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const printingServices = [
  "Xerox", "Scan", "Print", "T-shirt Sublimation", "T-shirt DTF", 
  "Mug Printing", "Laminating", "Sticker", "Photo Printing", "Document Binding",
];

export default function PrintingPriceForm({ price, onSuccess, onCancel }: PrintingPriceFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: price || {
      service: '',
      size: '',
      type: 'N/A',
      price: 0,
      notes: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, String(value));
        });

        formData.append('userId', user.uid);
        formData.append('userName', user.displayName || user.email!);

        if (price) {
          await updatePrintingPriceAction(price.id, formData);
          toast({ title: 'Success', description: 'Price updated successfully.' });
        } else {
          await addPrintingPriceAction(formData);
          toast({ title: 'Success', description: 'Price added successfully.' });
        }
        
        onSuccess?.();

      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
            control={form.control}
            name="service"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Service</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {printingServices.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="grid md:grid-cols-2 gap-6">
          <FormField control={form.control} name="size" render={({ field }) => (
            <FormItem>
              <FormLabel>Size</FormLabel>
              <FormControl><Input placeholder="e.g. A4, Short, 2R" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
           <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    <SelectItem value="N/A">N/A</SelectItem>
                    <SelectItem value="Color">Color</SelectItem>
                    <SelectItem value="Black & White">Black & White</SelectItem>
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />
        </div>
        <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
                <FormLabel>Price (₱)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
            <FormLabel>Notes (Optional)</FormLabel>
            <FormControl><Textarea placeholder="Add any relevant notes here..." {...field} /></FormControl>
            <FormMessage />
            </FormItem>
        )} />

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (price ? 'Saving...' : 'Adding...') : (price ? 'Save Changes' : 'Add Price')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
