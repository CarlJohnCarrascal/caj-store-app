
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CashTransaction, Account, Product, Customer } from '@/lib/types';
import { subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, ArrowUpDown, CalendarIcon, ArrowDown, ArrowUp, LayoutGrid, List, User, Wallet, Landmark, Hash, MessageSquare, Pencil } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/use-cart';
import { db } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, startAt, endAt, get, equalTo } from 'firebase/database';
import { format } from 'date-fns';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';


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

const useDebouncedValue = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};


export default function CashTransactionTable() {
  const [transactions, setTransactions] = React.useState<CashTransaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFetching, setIsFetching] = React.useState(false);

  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 500);
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [sort, setSort] = React.useState<{key: string, order: 'asc' | 'desc'}>({ key: 'transactionDate', order: 'desc' });
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [isMounted, setIsMounted] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState<any | null>(null);
  const { toast } = useToast();
  const { addToCart, setCartCustomer } = useCart();
  const { user, loading: authLoading } = useAuth();

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [type, setType] = React.useState('all');
  const [method, setMethod] = React.useState('all');
  const [accountUsed, setAccountUsed] = React.useState('all');
  const [status, setStatus] = React.useState('all');

  const fetchTransactionsByDate = React.useCallback(async (dateRange: DateRange | undefined) => {
    if (!dateRange?.from) return;
    setIsFetching(true);
    try {
        const transactionsRef = ref(db, 'cashTransactions');
        const fromDate = new Date(dateRange.from);
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        const q = query(
            transactionsRef,
            orderByChild('transactionDate'),
            startAt(fromDate.toISOString()),
            endAt(toDate.toISOString())
        );

        const snapshot = await get(q);
        const transactionList = snapshotToArray<CashTransaction>(snapshot);
        setTransactions(transactionList);
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch transactions.' });
    } finally {
        setIsFetching(false);
    }
  }, [toast]);

  React.useEffect(() => {
    setIsMounted(true);
    let accountsLoaded = false;
    let customersLoaded = false;

    const checkLoading = () => {
      if (accountsLoaded && customersLoaded) {
        setIsLoading(false);
      }
    };

    const accountsRef = ref(db, 'accounts');
    const unsubscribeAccounts = onValue(accountsRef, (snapshot) => {
      setAccounts(snapshotToArray<Account>(snapshot));
      accountsLoaded = true;
      checkLoading();
    });

    const customersRef = ref(db, 'customers');
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      setCustomers(snapshotToArray<Customer>(snapshot));
      customersLoaded = true;
      checkLoading();
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeCustomers();
    };
  }, []);

  React.useEffect(() => {
    if (!isLoading && !authLoading && user) {
        fetchTransactionsByDate(date);
    }
  }, [date, isLoading, fetchTransactionsByDate, authLoading, user]);

  React.useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 5) return;

    const searchOnlineByReference = async () => {
        const isAlreadyFetched = transactions.some(t => t.reference === debouncedSearch);
        if (isAlreadyFetched) return;
        
        setIsFetching(true);
        try {
            const transactionsRef = ref(db, 'cashTransactions');
            const q = query(transactionsRef, orderByChild('reference'), equalTo(debouncedSearch));
            const snapshot = await get(q);
            if (snapshot.exists()) {
                const fetchedList = snapshotToArray<CashTransaction>(snapshot);
                setTransactions(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newTransactions = fetchedList.filter(t => !existingIds.has(t.id));
                    if (newTransactions.length > 0) {
                        toast({ title: 'Found transaction', description: 'Added transaction from outside the current date range.' });
                        return [...newTransactions, ...prev];
                    }
                    return prev;
                });
            } else {
                 toast({ variant: 'default', title: 'Not Found', description: 'No transaction with that reference number was found.' });
            }
        } catch (error) {
            console.error("Failed to search by reference:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to search by reference.' });
        } finally {
            setIsFetching(false);
        }
    };
    
    searchOnlineByReference();
  }, [debouncedSearch, transactions, toast]);

  const handleAddToCart = (transaction: any) => {
    const finalPrice = transaction.transactionType === 'Cash In'
        ? transaction.amount + transaction.fee
        : transaction.fee - transaction.amount;

    const transactionAsProduct: Product = {
        id: `cashio-${transaction.reference}-${Date.now()}`,
        name: `${transaction.transactionType}: ${transaction.customerName}`,
        price: finalPrice,
        description: `Ref: ${transaction.reference} | Acct: ${transaction.accountName} (${transaction.accountNumber}) | Fee: ₱${transaction.fee.toFixed(2)} | Amt: ₱${transaction.amount.toFixed(2)}`,
        group: 'Financial',
        category: 'CashIO',
        show: false,
        stock: 1,
        unit: 'each',
        image: 'https://placehold.co/600x600.png',
        material: 'N/A',
        dimensions: 'N/A',
        originalTransactionId: transaction.id
    };
    
    addToCart(transactionAsProduct, 1);
    setCartCustomer({ name: transaction.customerName });

    toast({ title: 'Success', description: 'Transaction added to order.' });
    setSelectedTransaction(null);
  };

  const transactionsWithNames = React.useMemo(() => {
    const accountMap = new Map(accounts.map(acc => [acc.id, acc.accountName]));
    const customerMap = new Map(customers.map(c => [c.id, c.name]));
    return transactions.map(t => {
      const customerName = t.customerId
        ? (customerMap.get(t.customerId) || (t.customerId === 'unknown' ? 'Unknown Customer' : `Customer ID: ${t.customerId}`))
        : t.accountName;

      return {
        ...t,
        ourAccountName: accountMap.get(t.accountUsedId) || 'Unknown Account',
        customerName,
      };
    });
  }, [transactions, accounts, customers]);

  const filteredTransactions = React.useMemo(() => {
    return transactionsWithNames
      .filter(t => {
        const searchLower = search.toLowerCase();
        if (!searchLower) return true;
        return (
          t.reference.toLowerCase().includes(searchLower) ||
          t.customerName.toLowerCase().includes(searchLower) ||
          (t.message && t.message.toLowerCase().includes(searchLower))
        );
      })
      .filter(t => type === 'all' || t.transactionType === type)
      .filter(t => method === 'all' || t.paymentMethod === method)
      .filter(t => accountUsed === 'all' || t.accountUsedId === accountUsed)
      .filter(t => status === 'all' || t.status === status);
      // Date filtering is now done at fetch time
  }, [search, transactionsWithNames, type, method, accountUsed, status]);

  const summary = React.useMemo(() => {
    const totalIn = filteredTransactions
      .filter((t) => t.transactionType === 'Cash In')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOut = filteredTransactions
      .filter((t) => t.transactionType === 'Cash Out')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = filteredTransactions.length;
    return { totalIn, totalOut, totalTransactions };
  }, [filteredTransactions]);

  const sortedTransactions = React.useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      const aVal = (a as any)[sort.key];
      const bVal = (b as any)[sort.key];

      if (aVal === undefined || bVal === undefined) return 0;
      
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredTransactions, sort]);
  
  const handleSort = (key: string) => {
    setSort(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  }

  const paginatedTransactions = sortedTransactions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  React.useEffect(() => {
    setPage(1);
  }, [itemsPerPage, search, date, type, method, accountUsed, status]);

  const overallLoading = authLoading || isLoading;

  if (overallLoading) {
    return (
       <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Card>
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          </Card>
       </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-red-600">
                <ArrowDown className="h-5 w-5" />
                <span className="font-semibold text-lg">₱{summary.totalOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
                <ArrowUp className="h-5 w-5" />
                <span className="font-semibold text-lg">₱{summary.totalIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>
        <div className="text-sm text-muted-foreground">
            Total Transactions: <span className="font-semibold text-foreground">{summary.totalTransactions}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-auto md:max-w-xs">
          <Input
            placeholder="Search by reference, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            disabled={isFetching}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      
       <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters" className="border rounded-lg bg-card">
          <AccordionTrigger className="p-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              <span className="font-semibold">Filters & Options</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 pt-0 items-center">
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    disabled={isFetching}
                    className={cn(
                      "justify-start text-left font-normal w-full col-span-2 md:col-span-1",
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

              <Select onValueChange={setType} defaultValue="all">
                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Cash In">Cash In</SelectItem>
                  <SelectItem value="Cash Out">Cash Out</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={setMethod} defaultValue="all">
                <SelectTrigger><SelectValue placeholder="All Methods" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Gcash">Gcash</SelectItem>
                  <SelectItem value="Maya">Maya</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={setAccountUsed} defaultValue="all">
                <SelectTrigger><SelectValue placeholder="All Accounts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.accountName}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select onValueChange={setStatus} defaultValue="all">
                <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Claimed">Claimed</SelectItem>
                </SelectContent>
              </Select>
               <div className="flex items-center gap-2 justify-self-end col-span-full lg:col-span-1">
                  <span className="text-sm text-muted-foreground">View:</span>
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                    <LayoutGrid className="h-5 w-5" />
                  </Button>
                  <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('table')}>
                    <List className="h-5 w-5" />
                  </Button>
                </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>


      <Card>
        {isFetching ? (
            <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
        ) : viewMode === 'grid' ? (
           <div>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map(t => {
                const date = t.transactionDate ? new Date(t.transactionDate) : null;
                const isValidDate = date && !isNaN(date.getTime());

                return (
                <div
                  key={t.id}
                  className="border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedTransaction(t)}
                >
                  <div className="grid grid-cols-2 gap-4 items-start p-4">
                    <div className="space-y-1.5 min-w-0">
                      <p className="font-mono text-base font-medium break-all">{t.reference}</p>
                       <p className="text-sm text-muted-foreground truncate" title={`${t.accountName} (${t.accountNumber})`}>
                          {t.transactionType === 'Cash In' ? 'From: ' : 'To: '}
                          {t.accountName} {t.accountNumber}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                          Account Used: {t.ourAccountName} 
                      </p>
                      <div>
                        <Badge
                          variant={'default'}
                          className={cn(
                            {
                              'bg-green-600 hover:bg-green-700': t.status === 'Delivered' || t.status === 'Claimed',
                              'bg-cyan-500 hover:bg-cyan-600': t.status === 'Available',
                            }
                          )}
                        >
                          {t.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <div className="text-sm text-muted-foreground mb-1.5 h-4">
                        {isMounted && isValidDate ? format(date, 'PPp') : <Skeleton className="h-4 w-32" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold">
                          ₱{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {t.transactionType === 'Cash In' ? (
                          <ArrowUp className="h-6 w-6 text-green-600" />
                        ) : (
                          <ArrowDown className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )})
            ) : (
              <div className="h-24 text-center flex items-center justify-center">
                <p>No transactions found.</p>
              </div>
            )}
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('transactionDate')}>
                  Date <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Customer / Details</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className='text-right'>
                 <Button variant="ghost" onClick={() => handleSort('amount')}>
                  Amount <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map(t => {
                  const date = t.transactionDate ? new Date(t.transactionDate) : null;
                  const isValidDate = date && !isNaN(date.getTime());
                  return (
                    <TableRow key={t.id} onClick={() => setSelectedTransaction(t)} className="cursor-pointer">
                        <TableCell>
                          {isMounted && isValidDate ? format(date, 'PPp') : <Skeleton className="h-5 w-40" />}
                        </TableCell>
                        <TableCell>
                            <Badge className={t.transactionType === 'Cash In' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                                {t.transactionType}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{t.customerName}</div>
                            <div className="text-sm text-muted-foreground" title={`${t.accountName} - ${t.accountNumber}`}>{t.accountName} - {t.accountNumber}</div>
                            <div className="text-xs text-muted-foreground/80">via {t.ourAccountName}</div>
                        </TableCell>
                        <TableCell>{t.reference}</TableCell>
                        <TableCell className='text-right font-mono'>₱{t.amount.toFixed(2)}</TableCell>
                        <TableCell>
                            <Badge
                              variant={'default'}
                              className={cn(
                                {
                                  'bg-green-600 hover:bg-green-700': t.status === 'Delivered' || t.status === 'Claimed',
                                  'bg-cyan-500 hover:bg-cyan-600': t.status === 'Available',
                                }
                              )}
                            >
                                {t.status}
                            </Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                           <Button variant="ghost" size="icon" disabled>... </Button>
                        </TableCell>
                    </TableRow>
                  );
                })
            ) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No transactions found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </Card>
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-muted-foreground">
            Showing {Math.min(itemsPerPage * page, sortedTransactions.length)} of {sortedTransactions.length} transactions.
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm">Rows per page:</span>
                <Select value={String(itemsPerPage)} onValueChange={v => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="w-20"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        {[10, 20, 50, 100].map(v => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
        </div>
      </div>
      
      {selectedTransaction && (
        <Dialog open={!!selectedTransaction} onOpenChange={(isOpen) => !isOpen && setSelectedTransaction(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTransaction.transactionType === 'Cash In' ? (
                  <ArrowUp className="h-6 w-6 text-green-600" />
                ) : (
                  <ArrowDown className="h-6 w-6 text-red-600" />
                )}
                <span>{selectedTransaction.transactionType}</span>
              </DialogTitle>
              <DialogDescription>
                {(() => {
                  if (!isMounted || !selectedTransaction.transactionDate) return 'Loading date...';
                  const date = new Date(selectedTransaction.transactionDate);
                  if (!isNaN(date.getTime())) {
                    return format(date, 'PPpp');
                  }
                  return "Invalid Date";
                })()}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] -mx-6">
              <div className="space-y-6 py-4 px-6">
                <div className="space-y-2">
                    <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                        <span className="text-muted-foreground">Amount</span>
                        <p className="text-2xl font-bold break-all">
                        ₱{selectedTransaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="flex justify-between items-center text-sm px-1">
                        <span className="text-muted-foreground">Fee</span>
                        <span>₱{selectedTransaction.fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm px-1">
                        <span className="text-muted-foreground">Status</span>
                        <Badge
                            variant={'default'}
                            className={cn(
                            {
                                'bg-green-600 hover:bg-green-700': selectedTransaction.status === 'Delivered' || selectedTransaction.status === 'Claimed',
                                'bg-cyan-500 hover:bg-cyan-600': selectedTransaction.status === 'Available',
                            }
                            )}
                        >
                            {selectedTransaction.status}
                        </Badge>
                    </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2 text-muted-foreground">{selectedTransaction.transactionType === 'Cash In' ? 'From (Sender)' : 'To (Receiver)'}</h4>
                        <div className="pl-2 space-y-2 text-sm border-l">
                            <div className="flex items-start gap-3">
                                <User className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                                <p className="font-medium break-words">{selectedTransaction.accountName}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Wallet className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                                <p className="font-mono break-all">{selectedTransaction.accountNumber}</p>
                            </div>
                        </div>
                    </div>

                    {selectedTransaction.customerId && (
                        <div>
                            <h4 className="font-semibold mb-2 text-muted-foreground">Processed By (Store Customer)</h4>
                            <div className="pl-2 space-y-2 text-sm border-l">
                                <div className="flex items-start gap-3">
                                    <User className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                                    <p className="font-medium break-words">{selectedTransaction.customerName}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold mb-2 text-muted-foreground">Our Account</h4>
                        <div className="pl-2 space-y-2 text-sm border-l">
                            <div className="flex items-start gap-3">
                                <Landmark className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5"/>
                                <p className="break-words">{selectedTransaction.ourAccountName} via {selectedTransaction.paymentMethod}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2 text-muted-foreground">Details</h4>
                        <div className="pl-2 space-y-2 text-sm border-l">
                            <div className="flex items-start gap-3">
                                <Hash className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5"/>
                                <p className="font-mono break-all">{selectedTransaction.reference}</p>
                            </div>
                            {selectedTransaction.message && (
                                <div className="flex items-start gap-3">
                                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5"/>
                                    <p className="text-muted-foreground break-words">{selectedTransaction.message}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="sm:justify-between gap-2">
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link href={`/admin/cashio/edit/${selectedTransaction.id}`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setSelectedTransaction(null)} className="w-full">Close</Button>
                {selectedTransaction.status === 'Available' && (
                    <Button
                      onClick={() => selectedTransaction && handleAddToCart(selectedTransaction)}
                      className="w-full"
                    >
                      Add to Order
                    </Button>
                  )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
