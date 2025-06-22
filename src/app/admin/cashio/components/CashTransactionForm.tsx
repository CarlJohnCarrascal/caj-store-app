'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Account } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addCashTransactionAction } from '@/lib/actions';
import { useState, useTransition } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, RefreshCw, Bot } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { generateTransactionMessage } from '@/ai/flows/generate-transaction-message';

const formSchema = z.object({
  transactionType: z.enum(['Cash In', 'Cash Out']),
  accountUsedId: z.string().min(1, 'Please select an account.'),
  paymentMethod: z.enum(['Gcash', 'Maya', 'Other']),
  status: z.enum(['Pending', 'Delivered', 'Available', 'Claimed', 'Cancelled']),
  customerName: z.string().min(1, 'Customer name is required.'),
  accountName: z.string().min(1, "Sender/Receiver's account name is required."),
  accountNumber: z.string().min(1, "Sender/Receiver's account number is required."),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  fee: z.coerce.number().min(0, 'Fee cannot be negative.').default(0),
  reference: z.string().min(1, 'Reference is required.'),
  message: z.string().optional(),
});

type CashTransactionFormValues = z.infer<typeof formSchema>;

interface CashTransactionFormProps {
  accounts: Account[];
}

export default function CashTransactionForm({ accounts }: CashTransactionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionType: 'Cash In',
      accountUsedId: '',
      paymentMethod: 'Gcash',
      status: 'Pending',
      customerName: '',
      accountName: '',
      accountNumber: '',
      amount: 0,
      fee: 0,
      reference: '',
      message: '',
    },
  });

  const transactionType = form.watch('transactionType');

  const generateReference = () => {
    const prefix = 'TXN';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    form.setValue('reference', `${prefix}-${timestamp}-${random}`);
  };

  const onSubmit = (data: CashTransactionFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, String(value));
          }
        });

        await addCashTransactionAction(formData);
        toast({ title: 'Success', description: 'Transaction added successfully.' });
        router.push('/admin/cashio');
        router.refresh();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
      }
    });
  };

  const handleGenerateMessage = async () => {
    const { transactionType, customerName, amount, paymentMethod, reference } = form.getValues();
    if (!transactionType || !customerName || !amount) {
        toast({
            variant: 'destructive',
            title: 'Missing Details',
            description: 'Please fill in Type, Customer Name, and Amount to generate a message.',
        });
        return;
    }
    setIsGenerating(true);
    try {
        const result = await generateTransactionMessage({
            transactionType,
            customerName,
            amount,
            paymentMethod,
            reference: reference || '',
        });
        if(result.message) {
          form.setValue('message', result.message, { shouldValidate: true });
          toast({ title: 'Message Generated!', description: 'The AI-powered message has been populated.' });
        } else {
          throw new Error("AI did not return a message.");
        }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: 'Could not generate a message. Please try again.',
        });
    } finally {
        setIsGenerating(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>New Transaction</CardTitle>
        <CardDescription>Record a new cash in or cash out transaction.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="transactionType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Transaction Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset status when type changes
                        if (value === 'Cash In') {
                          form.setValue('status', 'Pending');
                        } else {
                          form.setValue('status', 'Available');
                        }
                      }}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="Cash In" id="cash-in" className="sr-only peer" />
                        </FormControl>
                        <Label
                          htmlFor="cash-in"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <ArrowUp className="mb-3 h-6 w-6 text-green-500" />
                          Cash In
                        </Label>
                      </FormItem>
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="Cash Out" id="cash-out" className="sr-only peer" />
                        </FormControl>
                        <Label
                          htmlFor="cash-out"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <ArrowDown className="mb-3 h-6 w-6 text-red-500" />
                          Cash Out
                        </Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="accountUsedId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Our Account Used</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.accountName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Gcash">Gcash</SelectItem>
                          <SelectItem value="Maya">Maya</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transactionType === 'Cash In' ? (
                            <>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Available">Available</SelectItem>
                              <SelectItem value="Claimed">Claimed</SelectItem>
                            </>
                          )}
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Sender/Receiver Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="accountName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Account Name on E-Wallet/Bank</FormLabel>
                                <FormControl><Input placeholder="e.g. John D." {...field} /></FormControl>
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
                     </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Transaction Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                     <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="amount" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="fee" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Fee</FormLabel>
                              <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="reference" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <div className="flex gap-2">
                           <FormControl><Input placeholder="e.g. REF12345" {...field} /></FormControl>
                           <Button type="button" variant="outline" size="icon" onClick={generateReference}>
                                <RefreshCw className="h-4 w-4" />
                           </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="message" render={({ field }) => (
                      <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>Message/Note (Optional)</FormLabel>
                            <Button type="button" variant="outline" size="sm" onClick={handleGenerateMessage} disabled={isGenerating}>
                              <Bot className="mr-2 h-4 w-4" />
                              {isGenerating ? 'Generating...' : 'Populate with AI'}
                            </Button>
                          </div>
                          <FormControl><Textarea placeholder="e.g. Payment for order #XYZ" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                    )} />
                </CardContent>
             </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Adding...' : 'Add Transaction'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
