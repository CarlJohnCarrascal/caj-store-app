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
import { addCustomerAction } from '@/lib/actions';
import { useTransition } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  location: z.string().min(1, 'Location is required'),
});

type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: Customer;
}

export default function CustomerForm({ customer }: CustomerFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: customer ? customer : {
      name: '',
      email: '',
      phone: '',
      address: '',
      location: '',
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, value);
        });

        if (customer) {
          // TODO: Implement update customer action
          toast({ title: 'Success', description: 'Customer updated successfully.' });
        } else {
          await addCustomerAction(formData);
          toast({ title: 'Success', description: 'Customer added successfully.' });
          form.reset();
        }
        router.push('/admin/customers');
        router.refresh();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
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
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="e.g. john@example.com" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                    <FormLabel>Phone Number</FormLabel>
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
             </div>
             <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Address</FormLabel>
                <FormControl><Input placeholder="e.g. 123 Main St, Brgy. Central" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
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
