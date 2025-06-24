'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateCustomerBalanceAction } from '@/lib/actions';
import { Customer } from '@/lib/types';
import { ArrowLeft, Landmark, DollarSign } from 'lucide-react';

interface CustomerActionButtonsProps {
  customer: Customer;
}

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

type FormValues = z.infer<typeof formSchema>;

export default function CustomerActionButtons({ customer }: CustomerActionButtonsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'payment' | 'balance' | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
    },
  });
  
  const handleOpenDialog = (type: 'payment' | 'balance') => {
    form.reset();
    setDialogType(type);
    setIsDialogOpen(true);
  };
  
  const onSubmit = (data: FormValues) => {
    const amount = dialogType === 'payment' ? -data.amount : data.amount;

    startTransition(async () => {
      try {
        await updateCustomerBalanceAction(customer.id, amount);
        toast({
          title: 'Success',
          description: `Customer balance updated successfully.`,
        });
        setIsDialogOpen(false);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update customer balance.',
        });
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-grow" />
        <Button variant="outline" onClick={() => handleOpenDialog('payment')}>
          <DollarSign className="mr-2 h-4 w-4" />
          Make Payment
        </Button>
        <Button onClick={() => handleOpenDialog('balance')}>
          <Landmark className="mr-2 h-4 w-4" />
          Add to Balance
        </Button>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'payment' ? 'Make a Payment' : 'Add to Balance'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'payment' 
                ? `Enter the amount ${customer.name} is paying towards their balance.`
                : `Enter the amount to add to ${customer.name}'s balance.`
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Processing...' : 'Confirm'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
