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
import { useState, useTransition } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CustomerForm from '@/app/admin/customers/components/CustomerForm';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.string().min(1, 'Value is required'),
  customerId: z.string().min(1, 'Customer is required'),
  note: z.string().optional(),
});

type CollectionFormValues = z.infer<typeof formSchema>;

interface CollectionFormProps {
  collection?: Collection;
  customers: Customer[];
  collectionNames: string[];
}

export default function CollectionForm({ collection, customers, collectionNames }: CollectionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: collection ? { ...collection, value: String(collection.value), note: collection.note || '' } : {
      name: '',
      value: '',
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
    <>
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
                    <FormControl>
                      <Input placeholder="e.g. Unpaid Invoice #123" {...field} list="collection-names" />
                    </FormControl>
                    <datalist id="collection-names">
                      {collectionNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl><Input placeholder="e.g. 1500.50 or Item Details" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Customer</FormLabel>
                    <div className="flex gap-2 items-start">
                      <div className="flex-grow">
                        <Combobox
                          options={customers.map(c => ({ value: c.id, label: c.name }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select a customer"
                          searchPlaceholder="Search customers..."
                          emptyPlaceholder="No customer found."
                        />
                      </div>
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => setIsCustomerDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Add New Customer</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
      
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                    Add a new customer to your records. They will be available to select after creation.
                </DialogDescription>
            </DialogHeader>
            <CustomerForm
                onSuccess={() => {
                    setIsCustomerDialogOpen(false);
                    router.refresh();
                    toast({ title: "Customer created", description: "You can now select the new customer from the list." });
                }}
                onCancel={() => setIsCustomerDialogOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
