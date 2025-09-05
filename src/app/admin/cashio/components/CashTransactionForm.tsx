

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
import { Account, Product, CashTransaction, FeeThreshold } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addCashTransactionAction, updateCashTransactionAction } from '@/lib/actions';
import { useState, useTransition, useEffect, useRef } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, Bot, ClipboardPaste } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { extractTransactionDetails } from '@/ai/flows/extract-transaction-details';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { getFeeThresholds, isReferenceNumberDuplicate, finalizeReceiptImage } from '@/lib/data';
import { calculateFee } from '@/lib/utils';


const formSchema = z.object({
  transactionType: z.enum(['Cash In', 'Cash Out']),
  accountUsedId: z.string().min(1, 'Please select an account.'),
  paymentMethod: z.enum(['Gcash', 'Maya', 'Other']),
  status: z.enum(['Delivered', 'Available', 'Claimed', 'Processing']),
  accountName: z.string().min(1, "Sender/Receiver's account name is required."),
  accountNumber: z.string().min(1, "Sender/Receiver's account number is required."),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  fee: z.coerce.number().min(0, 'Fee cannot be negative.').default(0),
  reference: z.string().min(1, 'Reference is required.'),
  message: z.string().optional(),
  datetime: z.string().optional(),
  fromScanned: z.string().optional(),
});

type CashTransactionFormValues = z.infer<typeof formSchema>;

interface CashTransactionFormProps {
  accounts: Account[];
  transaction?: Partial<CashTransaction>;
}

export default function CashTransactionForm({ accounts, transaction }: CashTransactionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [extractionResult, setExtractionResult] = useState<string | null>(null);
  const { addToCart, setCartCustomer, setCartOpen } = useCart();
  const { user } = useAuth();
  const [feeThresholds, setFeeThresholds] = useState<FeeThreshold[]>([]);

  const isEditing = !!transaction?.id;

  const form = useForm<CashTransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionType: 'Cash In',
      accountUsedId: '',
      paymentMethod: 'Gcash',
      status: 'Processing',
      accountName: '',
      accountNumber: '',
      reference: '',
      message: '',
      fromScanned: '',
      amount: 0,
      fee: 0,
      datetime: '',
      amount: transaction?.amount ? Number(transaction.amount) : 0,
      fee: transaction?.fee ? Number(transaction.fee) : 0,
      datetime: transaction?.datetime ? (transaction.datetime as any).slice(0, 16) : '',
      ...transaction,
    },
  });
  
  const watchedAmount = form.watch('amount');

  // Fetch fee thresholds on mount
  useEffect(() => {
    async function fetchThresholds() {
      const thresholds = await getFeeThresholds();
      setFeeThresholds(thresholds);
    }
    fetchThresholds();
  }, []);
  
  // Set the last used account from localStorage
  useEffect(() => {
    if (!isEditing && accounts.length > 0) { // Only for new transactions and when accounts are loaded
      const lastUsedAccountId = localStorage.getItem('lastUsedAccountId');
      if (lastUsedAccountId && accounts.some(acc => acc.id === lastUsedAccountId) && !form.getValues('accountUsedId')) {
        form.setValue('accountUsedId', lastUsedAccountId, { shouldValidate: true });
      }
    }
  }, [accounts, isEditing, form]);

  // Recalculate fee whenever amount or thresholds change
  useEffect(() => {
    if (watchedAmount > 0 && feeThresholds.length > 0) {
      const calculatedFee = calculateFee(watchedAmount, feeThresholds);
      // Only set the fee if it's different to avoid re-renders
      if (calculatedFee !== form.getValues('fee')) {
        form.setValue('fee', calculatedFee, { shouldValidate: true });
      }
    }
  }, [watchedAmount, feeThresholds, form]);

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        toast({
          variant: 'destructive',
          title: 'Paste Not Supported',
          description: 'Pasting from clipboard is not supported or not allowed by your browser.',
        });
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        form.setValue('message', text, { shouldValidate: true });
        toast({
          title: 'Pasted!',
          description: 'Message pasted from clipboard.',
        });
        handleExtractDetails(text);
      } else {
        toast({
          variant: 'default',
          title: 'Clipboard Empty',
          description: 'There was no text on your clipboard to paste.',
        });
      }
    } catch (error) {
      console.error('Failed to read clipboard contents: ', error);
      toast({
        variant: 'destructive',
        title: 'Paste Failed',
        description: 'Could not read from clipboard. You may need to grant permission in your browser settings.',
      });
    }
  };

  const handleExtractDetails = async (messageToExtract?: string) => {
    const message = messageToExtract || form.getValues('message');
    if (!message || message.trim().length < 10) {
        toast({
            variant: 'destructive',
            title: 'Message is too short',
            description: 'Please paste a detailed message to extract details from.',
        });
        return;
    }
    setIsGenerating(true);
    setExtractionResult(null);
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
                const formTransactionType = data.transactionType === 'sent' ? 'Cash In' : 'Cash Out';
                form.setValue('transactionType', formTransactionType, { shouldValidate: true });
                if (formTransactionType === 'Cash In') {
                  form.setValue('status', 'Processing');
                } else {
                  form.setValue('status', 'Available');
                }
                populatedFields.push('transactionType');
            }
            
            if (data.datetime) {
                try {
                  // AI returns yyyy-mm-ddThh:mm:ss+08:00
                  // Input wants YYYY-MM-DDTHH:mm
                  const localDateTime = data.datetime.slice(0, 16);
                  form.setValue('datetime', localDateTime, { shouldValidate: true });
                  populatedFields.push('datetime');
                } catch (e) {
                  console.warn("Could not parse AI-extracted date:", data.datetime);
                }
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


  const onSave = (data: CashTransactionFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }
    startTransition(async () => {
      try {
        const isDuplicate = await isReferenceNumberDuplicate(data.reference);
        if (isDuplicate) {
          toast({ variant: 'destructive', title: 'Duplicate!', description: 'The transaction reference already exists' });
          return;
        }

        localStorage.setItem('lastUsedAccountId', data.accountUsedId);
        const formData = new FormData();
        const dataToSubmit = { ...data, status: 'Available' as const };
        Object.entries(dataToSubmit).forEach(([key, value]) => {
            formData.append(key, String(value));
        });

        formData.append('userId', user.uid);
        formData.append('userName', user.displayName || user.email!);

        let imageUrl = '';

        //upload image
        if (data.fromScanned) {
          const storedItemRaw = localStorage.getItem("temp_receipt_image_" + data.fromScanned);
          if (storedItemRaw) {
            const storedItem = JSON.parse(storedItemRaw);
            const folder = data.transactionType === 'Cash Out' ? 'cashout' : 'cashin';
            imageUrl = await finalizeReceiptImage(storedItem.image, folder, data.reference);
            formData.append('receiptImageUrl', imageUrl);
          }
        }

        await addCashTransactionAction(formData);

        // Clean up local storage after successful processing
        const temp_reciept_list = JSON.parse(localStorage.getItem('temp_receipt_id_list') || '[]');
        for (const item of temp_reciept_list) {
          localStorage.removeItem('temp_receipt_image_' + item);
        }
        localStorage.removeItem('temp_receipt_id_list');

        toast({ title: 'Success', description: 'Transaction saved successfully.' });
        router.push('/admin/cashio');
        router.refresh();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
      }
    });
  };
  
  const onAddToOrder = (data: CashTransactionFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }
    startTransition(async () => {
      try {
        const isDuplicate = await isReferenceNumberDuplicate(data.reference);
        if (isDuplicate) {
            toast({ variant: 'destructive', title: 'Duplicate!', description: 'The transaction reference already exists.' });
            return;
        }

        localStorage.setItem('lastUsedAccountId', data.accountUsedId);
        const finalStatus = data.transactionType === 'Cash In' ? 'Processing' : 'Available';
        
        const formData = new FormData();
        const dataToSubmit = { ...data, status: finalStatus };
        Object.entries(dataToSubmit).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, String(value));
          }
        });

        formData.append('userId', user.uid);
        formData.append('userName', user.displayName || user.email!);

        let imageUrl = '';

        //upload image
        if (data.fromScanned) {
          const storedItemRaw = localStorage.getItem("temp_receipt_image_" + data.fromScanned);
          if (storedItemRaw) {
            const storedItem = JSON.parse(storedItemRaw);

            const folder = data.transactionType === 'Cash Out' ? 'cashout' : 'cashin';
            imageUrl = await finalizeReceiptImage(storedItem.image, folder, data.reference);
            formData.append('receiptImageUrl', imageUrl);
          }
        }

        const newTransaction = await addCashTransactionAction(formData);
        
        // Clean up local storage after successful processing
        const temp_reciept_list = JSON.parse(localStorage.getItem('temp_receipt_id_list') || '[]');
        for (const item of temp_reciept_list) {
                localStorage.removeItem('temp_receipt_image_' + item);
        }
        localStorage.removeItem('temp_receipt_id_list');


        const finalPrice = newTransaction.transactionType === 'Cash In' ? newTransaction.amount + newTransaction.fee : -(newTransaction.amount - newTransaction.fee);

        const transactionAsProduct: Product = {
            id: `cashio-${newTransaction.reference}-${Date.now()}`,
            name: `${newTransaction.transactionType}: ${newTransaction.accountName}`,
            price: finalPrice,
            description: `Ref: ${newTransaction.reference} | Acct: ${newTransaction.accountName} (${newTransaction.accountNumber}) | Fee: ₱${newTransaction.fee.toFixed(2)} | Amt: ₱${newTransaction.amount.toFixed(2)}`,
            group: 'Financial',
            category: 'CashIO',
            show: false,
            stock: 1,
            unit: 'each',
            image: imageUrl,
            material: 'N/A',
            dimensions: 'N/A',
            originalTransactionId: newTransaction.id
        };
        
        addToCart(transactionAsProduct, 1);
        setCartCustomer({ name: newTransaction.accountName });

        toast({ title: 'Success', description: 'Transaction added to order.' });
        form.reset();
        setCartOpen(true);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
      }
    });
  };

  const onUpdate = (data: CashTransactionFormValues) => {
    if (!transaction?.id) return;
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }
    startTransition(async () => {
        try {
            localStorage.setItem('lastUsedAccountId', data.accountUsedId);
            const formData = new FormData();
            const dataToSubmit = { ...data };
            Object.entries(dataToSubmit).forEach(([key, value]) => {
                if (value !== undefined) {
                    formData.append(key, String(value));
                }
            });
            
            formData.append('userId', user.uid);
            formData.append('userName', user.displayName || user.email!);

            await updateCashTransactionAction(transaction.id, formData);
            toast({ title: 'Success', description: 'Transaction updated successfully.' });
            router.push('/admin/cashio');
            router.refresh();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
        }
    });
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Transaction' : 'New Transaction'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Update the details of an existing transaction.' : 'Record a new cash in or cash out transaction.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              {!isEditing && (
                <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Transaction Message (Optional)</FormLabel>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={handlePaste} disabled={isGenerating}>
                                <ClipboardPaste className="mr-2 h-4 w-4" />
                                Paste
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleExtractDetails()} disabled={isGenerating}>
                                <Bot className="mr-2 h-4 w-4" />
                                {isGenerating ? 'Extracting...' : 'Extract with AI'}
                            </Button>
                          </div>
                        </div>
                        <FormControl><Textarea placeholder="Paste transaction message here to auto-fill details..." {...field} rows={4} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              )}

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
                          if (value === 'Cash In') {
                            form.setValue('status', 'Processing');
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
              
              <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="accountUsedId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Our Account Used</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} className={cn(highlightedFields.includes('fee') && 'ring-2 ring-primary ring-offset-2 transition-all')} /></FormControl>
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
                {isEditing ? (
                  <Button type="button" onClick={form.handleSubmit(onUpdate)} disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                ) : (
                  <>
                    {form.getValues('transactionType') === 'Cash Out' && (
                      <Button variant="secondary" type="button" onClick={form.handleSubmit(onSave)} disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save'}
                      </Button>
                    )}
                    <Button type="button" onClick={form.handleSubmit(onAddToOrder)} disabled={isPending}>
                      {isPending ? 'Adding...' : 'Add to Order'}
                    </Button>
                  </>
                )}
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
