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
import { ArrowDown, ArrowUp, Bot } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { extractTransactionDetails } from '@/ai/flows/extract-transaction-details';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  transactionType: z.enum(['Cash In', 'Cash Out']),
  accountUsedId: z.string().min(1, 'Please select an account.'),
  paymentMethod: z.enum(['Gcash', 'Maya', 'Other']),
  status: z.enum(['Delivered', 'Available', 'Claimed']),
  accountName: z.string().min(1, "Sender/Receiver's account name is required."),
  accountNumber: z.string().min(1, "Sender/Receiver's account number is required."),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  fee: z.coerce.number().min(0, 'Fee cannot be negative.').default(0),
  reference: z.string().min(1, 'Reference is required.'),
  message: z.string().optional(),
  datetime: z.string().optional(),
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
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [extractionResult, setExtractionResult] = useState<string | null>(null);

  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionType: 'Cash In',
      accountUsedId: '',
      paymentMethod: 'Gcash',
      status: 'Delivered',
      accountName: '',
      accountNumber: '',
      amount: 0,
      fee: 0,
      reference: '',
      message: '',
      datetime: '',
    },
  });

  const transactionType = form.watch('transactionType');
  const status = form.watch('status');

  const onSubmit = (data: CashTransactionFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, String(value));
          }
        });
        // Set customerName from accountName
        formData.append('customerName', data.accountName);

        await addCashTransactionAction(formData);
        toast({ title: 'Success', description: 'Transaction added successfully.' });
        router.push('/admin/cashio');
        router.refresh();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
      }
    });
  };

  const handleExtractDetails = async () => {
    const message = form.getValues('message');
    if (!message || message.trim().length < 10) {
        toast({
            variant: 'destructive',
            title: 'Message is too short',
            description: 'Please paste a detailed message to extract details from.',
        });
        return;
    }
    setIsGenerating(true);
    setExtractionResult(null); // Clear previous result
    try {
        const result = await extractTransactionDetails({ message });

        if (result.raw) {
          setExtractionResult(result.raw);
        }

        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Extraction Failed',
                description: result.error,
            });
            return;
        }

        const populatedFields: string[] = [];
        const data = result.data;

        if (data) {
            if (data.transactionType) {
                // 'sent' from the message author's (customer's) perspective means they sent you money (Cash In).
                const formTransactionType = data.transactionType === 'sent' ? 'Cash In' : 'Cash Out';
                form.setValue('transactionType', formTransactionType, { shouldValidate: true });
                populatedFields.push('transactionType');
            }
            
            if (data.datetime) {
                // Format to YYYY-MM-DDTHH:mm which is required by datetime-local input
                const localDateTime = new Date(data.datetime).toISOString().slice(0, 16);
                form.setValue('datetime', localDateTime, { shouldValidate: true });
                populatedFields.push('datetime');
            }
            
            if (data.amount) {
                form.setValue('amount', data.amount, { shouldValidate: true });
                populatedFields.push('amount');
            }
            
            if (data.accountName) {
                form.setValue('accountName', data.accountName, { shouldValidate: true });
                populatedFields.push('accountName');
            }
            
            if (data.accountNumber) {
                form.setValue('accountNumber', data.accountNumber, { shouldValidate: true });
                populatedFields.push('accountNumber');
            }
            
            if (data.reference) {
                form.setValue('reference', data.reference, { shouldValidate: true });
                populatedFields.push('reference');
            }
        }


        if(populatedFields.length > 0) {
            setHighlightedFields(populatedFields);
            setTimeout(() => setHighlightedFields([]), 3000);
            toast({ title: 'Details Extracted!', description: 'The form has been populated with details from the message.' });
        } else {
            toast({ title: 'No Details Found', description: 'The AI could not find any details to extract. Please fill the form manually.' });
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: error.message || 'Could not extract details. Please fill the form manually.',
        });
    } finally {
        setIsGenerating(false);
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>New Transaction</CardTitle>
          <CardDescription>Record a new cash in or cash out transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                      <div className="flex justify-between items-center">
                      <FormLabel>Transaction Message (Optional)</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={handleExtractDetails} disabled={isGenerating}>
                          <Bot className="mr-2 h-4 w-4" />
                          {isGenerating ? 'Extracting...' : 'Extract Details with AI'}
                      </Button>
                      </div>
                      <FormControl><Textarea placeholder="Paste transaction message here to auto-fill details..." {...field} rows={4} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />

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
                            form.setValue('status', 'Delivered');
                          } else {
                            form.setValue('status', 'Available');
                          }
                        }}
                        value={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="Cash In" id="cash-in" className="sr-only peer" />
                          </FormControl>
                          <Label
                            htmlFor="cash-in"
                            className={cn(
                              "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all",
                              highlightedFields.includes('transactionType') && 'ring-2 ring-primary ring-offset-2'
                            )}
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
                            className={cn(
                              "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all",
                              highlightedFields.includes('transactionType') && 'ring-2 ring-primary ring-offset-2'
                            )}
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
                            <SelectTrigger className={cn(highlightedFields.includes('paymentMethod') && 'ring-2 ring-primary ring-offset-2 transition-all')}>
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
                                <SelectItem value="Delivered">Delivered</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="Available">Available</SelectItem>
                                <SelectItem value="Claimed">Claimed</SelectItem>
                              </>
                            )}
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
                      <div className="grid md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="accountName" render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Account Name on E-Wallet/Bank</FormLabel>
                                  <FormControl><Input placeholder="e.g. John D." {...field} className={cn(highlightedFields.includes('accountName') && 'ring-2 ring-primary ring-offset-2 transition-all')} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="accountNumber" render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Account Number</FormLabel>
                                  <FormControl><Input placeholder="e.g. 09123456789" {...field} className={cn(highlightedFields.includes('accountNumber') && 'ring-2 ring-primary ring-offset-2 transition-all')} /></FormControl>
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
                      <FormField control={form.control} name="datetime" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Transaction Date & Time</FormLabel>
                              <FormControl>
                                  <Input type="datetime-local" {...field} className={cn(highlightedFields.includes('datetime') && 'ring-2 ring-primary ring-offset-2 transition-all')} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <div className="grid md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} className={cn(highlightedFields.includes('amount') && 'ring-2 ring-primary ring-offset-2 transition-all')} /></FormControl>
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
                          <FormControl><Input placeholder="e.g. REF12345" {...field} className={cn(highlightedFields.includes('reference') && 'ring-2 ring-primary ring-offset-2 transition-all')} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                  </CardContent>
              </Card>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Processing...' : status === 'Available' ? 'Save' : 'Add to Order'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {extractionResult && (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>AI Extraction Result</CardTitle>
                <CardDescription>This is the raw JSON output from the AI model.</CardDescription>
            </CardHeader>
            <CardContent>
                <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto">
                    <code>{JSON.stringify(JSON.parse(extractionResult), null, 2)}</code>
                </pre>
            </CardContent>
        </Card>
      )}
    </>
  );
}
