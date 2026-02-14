
'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { Expense } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteExpenseAction } from '@/lib/actions';
import { Pencil, Trash2, Search, SlidersHorizontal, CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { getStoreData, setStoreData, deleteItem } from '@/lib/offline';
import { deleteExpense, logActivity } from '@/lib/data';

const ADMIN_EXPENSES_FILTERS_KEY = 'adminExpensesFilters';

function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
  const items: (T & { id: string })[] = [];
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot: any) => {
      items.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });
  }
  return items;
}

export default function ExpenseList() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
  const { user, activeStoreId } = useAuth();
  
  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_EXPENSES_FILTERS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSearchTerm(parsed.searchTerm ?? '');
        setCategoryFilter(parsed.categoryFilter ?? 'all');
        if (parsed.date?.from) {
          setDate({
            from: new Date(parsed.date.from),
            to: parsed.date.to ? new Date(parsed.date.to) : undefined,
          });
        }
      } catch (e) {
        console.error('Failed to parse expense filters', e);
      }
    }
  }, []);

  useEffect(() => {
    const toSave = {
      searchTerm,
      categoryFilter,
      date: date ? { from: date.from?.toISOString(), to: date.to?.toISOString() } : undefined,
    };
    localStorage.setItem(ADMIN_EXPENSES_FILTERS_KEY, JSON.stringify(toSave));
  }, [searchTerm, categoryFilter, date]);

  useEffect(() => {
    if (!activeStoreId) {
        setIsLoading(false);
        return;
    }
    const loadFromCache = async () => {
        const cachedData = await getStoreData<Expense>('expenses');
        if (cachedData.length > 0) {
            setExpenses(cachedData.map(e => ({...e, date: new Date(e.date)})));
            setIsLoading(false);
        }
    };
    loadFromCache();

    const expensesRef = ref(db, `storeData/${activeStoreId}/expenses`);
    const unsubscribe = onValue(expensesRef, (snapshot) => {
      const expenseList = snapshotToArray<Expense>(snapshot);
      const expensesWithDates = expenseList.map(e => ({
        ...e,
        date: new Date(e.date),
        createdAt: e.createdAt,
      }));
      setExpenses(expensesWithDates);
      setIsLoading(false);
      setStoreData('expenses', expenseList);
    }, (error) => {
        console.error("Firebase listener failed:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeStoreId]);

  const categories = useMemo(() => ['all', ...new Set(expenses.map(e => e.category))], [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(expense => {
        if (categoryFilter === 'all') return true;
        return expense.category === categoryFilter;
      })
      .filter(expense => {
        if (!searchTerm) return true;
        return expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .filter(e => {
        if (!date?.from) return true;
        const from = date.from;
        const to = date.to || from;
        return e.date >= from && e.date <= new Date(to.getTime() + 86400000);
      })
      .sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [expenses, searchTerm, categoryFilter, date]);
  
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleDelete = (id: string) => {
    if (!user || !activeStoreId) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to delete expenses.' });
        return;
    }
    startTransition(async () => {
      try {
        const deletedExpense = await deleteExpense(activeStoreId, id);
        if (deletedExpense) {
            await logActivity({
                type: 'Expense',
                action: 'Deleted',
                details: `Expense "${deletedExpense.description}" of ₱${deletedExpense.amount.toFixed(2)} was deleted.`,
                targetId: id,
                userId: user.uid,
                userName: user.displayName || user.email!,
            });
        }
        await deleteExpenseAction();
        await deleteItem('expenses', id);
        toast({ title: 'Success', description: 'Expense deleted successfully.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete expense.' });
      }
    });
  };
  
  if (isLoading) {
    return (
       <Card>
            <Skeleton className="h-16 w-full" />
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-28" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                           <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-24" /></TableCell>
                           </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
       </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <h3 className="text-xl font-semibold">No Expenses Found</h3>
        <p className="text-muted-foreground mt-2">Start by adding a new expense to track your spending.</p>
         <Button asChild className="mt-4">
          <Link href="/admin/expenses/new">
            Add Expense
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters" className="border rounded-lg bg-card">
          <AccordionTrigger className="p-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              <span className="font-semibold">Filters & Search</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 pt-0 items-end">
                <div className="relative flex-grow w-full">
                  <Label htmlFor="search">Search Description</Label>
                  <Search className="absolute left-3 top-[2.4rem] -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="e.g. Office Supplies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <div>
                    <Label htmlFor="category">Filter by Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger id="category" className="w-full">
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(category => (
                            <SelectItem key={category} value={category}>{category === 'all' ? 'All Categories' : category}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                  <Label>Filter by Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="truncate">
                          {date?.from ? (
                            date.to ? (
                              <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(date.from, "LLL dd, y")
                            )
                          ) : (
                            "Pick a date range"
                          )}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), 'PP')}</TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={expense.notes || ''}>{expense.notes || '-'}</TableCell>
                    <TableCell className="text-right font-mono">₱{expense.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/expenses/edit/${expense.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this expense record. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(expense.id)}
                                disabled={isPending}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {isPending ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No expenses match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-end font-semibold p-4 border-t">
          <div className="text-lg">
             Total: <span className="font-bold">₱{totalExpenses.toFixed(2)}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
