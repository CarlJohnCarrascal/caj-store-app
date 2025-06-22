'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collection, Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addCollectionAction, updateCollectionAction } from '@/lib/actions';
import { useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.coerce.number().positive('Value must be a positive number'),
  customerId: z.string().min(1, 'Customer is required'),
  note: z.string().optional(),
});

type CollectionFormValues = z.infer<typeof formSchema>;

interface CollectionFormProps {
  collection?: Collection;
  customers: Customer[];
}

export default function CollectionForm({ collection, customers }: CollectionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: collection ? { ...collection, note: collection.note || '' } : {
      name: '',
      value: 0,
      customerId: '',
      note: '',
    },
  });

  const onSubmit = (data: CollectionFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, String(value));
          }
        });

        if (collection) {
          await updateCollectionAction(collection.id, formData);
          toast({ title: 'Success', description: 'Collection updated successfully.' });
        } else {
          await addCollectionAction(formData);
          toast({ title: 'Success', description: 'Collection added successfully.' });
          form.reset();
        }
        router.push('/admin/collections');
        router.refresh();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{collection ? 'Edit Collection' : 'Create Collection'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Collection Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Unpaid Invoice #123" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
             <FormField control={form.control} name="customerId" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Note (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Add any relevant notes here..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (collection ? 'Saving...' : 'Adding...') : (collection ? 'Save Changes' : 'Add Collection')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
