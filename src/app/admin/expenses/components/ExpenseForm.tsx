
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { addExpenseAction, updateExpenseAction } from '@/lib/actions';
import { useTransition } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/hooks/use-auth';
import { addExpense, updateExpense, logActivity } from '@/lib/data';

const formSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  category: z.string().min(1, 'Category is required.'),
  date: z.string().min(1, 'Date is required.'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  categories: string[];
}

export default function ExpenseForm({ expense, categories }: ExpenseFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { user, activeStoreId } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: expense ? { 
        ...expense, 
        amount: Number(expense.amount),
        date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : '',
        notes: expense.notes || ''
    } : {
      description: '',
      amount: 0,
      category: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!user || !activeStoreId) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in and have an active store.' });
        return;
    }
    startTransition(async () => {
      try {
        const userPayload = { userId: user.uid, userName: user.displayName || user.email! };
        const redirectPath = pathname.startsWith('/pos') ? '/pos/expenses' : '/admin/expenses';
        
        if (expense) {
          await updateExpense(activeStoreId, expense.id, data, userPayload);
          await logActivity({
            type: 'Expense',
            action: 'Updated',
            details: `Expense "${data.description}" was updated.`,
            targetId: expense.id,
            ...userPayload
          });
          await updateExpenseAction(expense.id);
          toast({ title: 'Success', description: 'Expense updated successfully.' });
        } else {
          const newExpense = await addExpense(activeStoreId, data, userPayload);
           await logActivity({
            type: 'Expense',
            action: 'Created',
            details: `Expense "${newExpense.description}" of ₱${newExpense.amount.toFixed(2)} was created.`,
            targetId: newExpense.id,
            ...userPayload
          });
          await addExpenseAction();
          toast({ title: 'Success', description: 'Expense added successfully.' });
          form.reset();
        }
        router.push(redirectPath);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expense ? 'Edit Expense' : 'Create Expense'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="e.g. Office Supplies" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )} />
            <div className="grid md:grid-cols-3 gap-6">
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g. 500.00" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Utilities, Rent" {...field} list="expense-categories" />
                        </FormControl>
                        <datalist id="expense-categories">
                        {categories.map((name) => (
                            <option key={name} value={name} />
                        ))}
                        </datalist>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Expense Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(new Date(field.value), "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Add any relevant notes here..." {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )} />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (expense ? 'Saving...' : 'Adding...') : (expense ? 'Save Changes' : 'Add Expense')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
