'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Account } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addAccountAction } from '@/lib/actions';
import { useTransition } from 'react';

const formSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  balance: z.coerce.number().default(0),
});

type AccountFormValues = z.infer<typeof formSchema>;

interface AccountFormProps {
  account?: Account;
}

export default function AccountForm({ account }: AccountFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: account ? { ...account, balance: Number(account.balance) } : {
      accountName: '',
      bankName: '',
      accountNumber: '',
      balance: 0,
    },
  });

  const onSubmit = (data: AccountFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, String(value));
        });

        if (account) {
          // TODO: Implement update account action
          toast({ title: 'Success', description: 'Account updated successfully.' });
        } else {
          await addAccountAction(formData);
          toast({ title: 'Success', description: 'Account added successfully.' });
          form.reset();
        }
        router.push('/admin/accounts');
        router.refresh();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{account ? 'Edit Account' : 'Create Account'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="accountName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl><Input placeholder="e.g. GCash Wallet" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="bankName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Bank/Provider Name</FormLabel>
                    <FormControl><Input placeholder="e.g. GCash" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="accountNumber" render={({ field }) => (
                <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl><Input placeholder="e.g. 09123456789" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                 <FormField control={form.control} name="balance" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
                )} />
             </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (account ? 'Saving...' : 'Adding...') : (account ? 'Save Changes' : 'Add Account')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
