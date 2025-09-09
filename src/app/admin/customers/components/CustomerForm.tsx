
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addCustomerAction, updateCustomerAction } from '@/lib/actions';
import { useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  location: z.string().min(1, 'Location is required'),
  balance: z.coerce.number().default(0),
});

type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: (newCustomer: Customer) => void;
  onCancel?: () => void;
}

export default function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: customer ? { ...customer, email: customer.email || '', phone: customer.phone || '' } : {
      name: '',
      email: '',
      phone: '',
      address: '',
      location: '',
      balance: 0,
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
        
        formData.append('userId', user.uid);
        formData.append('userName', user.displayName || user.email!);

        if (customer) {
          const updatedCustomer = await updateCustomerAction(customer.id, formData);
          toast({ title: 'Success', description: 'Customer updated successfully.' });
          if (onSuccess) {
            onSuccess(updatedCustomer);
          } else {
            router.push('/admin/customers');
            router.refresh();
          }
        } else {
          const newCustomer = await addCustomerAction(formData);
          toast({ title: 'Success', description: 'Customer added successfully.' });
          form.reset();
          if (onSuccess) {
            onSuccess(newCustomer);
          } else {
            router.push('/admin/customers');
            router.refresh();
          }
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{customer ? 'Edit Customer' : 'Create Customer'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="e.g. john@example.com" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. 09123456789" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                 <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                    <FormLabel>Location (City/Municipality)</FormLabel>
                    <FormControl><Input placeholder="e.g. Anytown" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                 <FormField control={form.control} name="balance" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} disabled={!!customer} /></FormControl>
                      <FormMessage />
                  </FormItem>
                )} />
             </div>
             <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Address</FormLabel>
                <FormControl><Input placeholder="e.g. 123 Main St, Brgy. Central" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={onCancel ? onCancel : () => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (customer ? 'Saving...' : 'Adding...') : (customer ? 'Save Changes' : 'Add Customer')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
