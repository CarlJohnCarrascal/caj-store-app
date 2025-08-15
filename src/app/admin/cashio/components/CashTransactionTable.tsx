

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
import { Search, SlidersHorizontal, ArrowUpDown, CalendarIcon, ArrowDown, ArrowUp, LayoutGrid, List, User, Wallet, Landmark, Hash, MessageSquare, Pencil, Trash2, Clock, Loader2, FileImage } from 'lucide-react';
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
import { ref, onValue, query, orderByChild, get, equalTo } from 'firebase/database';
import { format } from 'date-fns';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
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
import { deleteCashTransactionAction } from '@/lib/actions';
import { getStoreData, setStoreData, deleteItem, getReportData } from '@/lib/offline';
import Image from 'next/image';


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

type OverallReport = {
    cashInTotal: number;
    cashOutTotal: number;
    totalTransactions: number;
} | null;

interface CashTransactionTableProps {
  isSearchOpen: boolean;
  onSearchOpenChange: (isOpen: boolean) => void;
}

export default function CashTransactionTable({ isSearchOpen, onSearchOpenChange }: CashTransactionTableProps) {
  const [transactions, setTransactions] = React.useState<CashTransaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isPendingDelete, startDeleteTransition] = React.useTransition();
  const [overallReport, setOverallReport] = React.useState<OverallReport>(null);

  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 500);
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [sort, setSort] = React.useState<{key: string, order: 'asc' | 'desc'}>({ key: 'transactionDate', order: 'desc' });
  const [viewMode, setViewMode] = React.useState<'grid' | 'grid'>('grid');
  const [isMounted, setIsMounted] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState<any | null>(null);
  const { toast } = useToast();
  const { addToCart, setCartCustomer, setCartOpen } = useCart();
  const { user, loading: authLoading } = useAuth();
  
  const [referenceSearch, setReferenceSearch] = React.useState('');
  const [isSearchingByRef, setIsSearchingByRef] = React.useState(false);
  const [foundTransaction, setFoundTransaction] = React.useState<any | null>(null);
  const [searchAttempted, setSearchAttempted] = React.useState(false);

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [type, setType] = React.useState('all');
  const [method, setMethod] = React.useState('all');
  const [accountUsed, setAccountUsed] = React.useState('all');
  const [status, setStatus] = React.useState('all');


  React.useEffect(() => {
    setIsMounted(true);
    let allDataLoaded = false;
    
    // Load all data from cache first
    const loadFromCache = async () => {
        const cachedAccounts = await getStoreData<Account>('accounts');
        const cachedCustomers = await getStoreData<Customer>('customers');
        const cachedReports = await getReportData<any>('cashIOReports');

        setAccounts(cachedAccounts);
        setCustomers(cachedCustomers);
        
        if (cachedReports?.overall?.['all-time']) {
            setOverallReport(cachedReports.overall['all-time']);
        }

        if (cachedAccounts.length > 0 && cachedCustomers.length > 0 && cachedReports) {
            allDataLoaded = true;
            setIsLoading(false);
        }
    };
    loadFromCache();

    const reportsRef = ref(db, 'cashIOReports/overall/all-time');
    const unsubscribeReports = onValue(reportsRef, (snapshot) => {
        if (snapshot.exists()) {
            setOverallReport(snapshot.val());
        }
    });

    // Listen for live updates
    const accountsRef = ref(db, 'accounts');
    const unsubscribeAccounts = onValue(accountsRef, (snapshot) => {
      const accountList = snapshotToArray<Account>(snapshot);
      setAccounts(accountList);
      setStoreData('accounts', accountList);
    });

    const customersRef = ref(db, 'customers');
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const customerList = snapshotToArray<Customer>(snapshot);
      setCustomers(customerList);
      setStoreData('customers', customerList);
      if (!allDataLoaded) {
          setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeCustomers();
      unsubscribeReports();
    };
  }, []);

  React.useEffect(() => {
    if (authLoading || !user) return;
    
    // Load from cache that matches date range
    const loadFromCache = async () => {
        setIsFetching(true);
        const cachedTxs = await getStoreData<CashTransaction>('cashTransactions');
        if (cachedTxs.length > 0) {
            setTransactions(cachedTxs);
        }
        setIsFetching(false);
    }
    loadFromCache();

    // Fetch from Firebase for all transactions and update cache
    setIsFetching(true);
    const transactionsRef = ref(db, 'cashTransactions');
    const q = query(transactionsRef, orderByChild('transactionDate'));

    const unsubscribe = onValue(q, (snapshot) => {
      const transactionList = snapshotToArray<CashTransaction>(snapshot);
      setTransactions(transactionList);
      setStoreData('cashTransactions', transactionList); // Cache the fetched range
      setIsFetching(false);
    }, (error) => {
      console.error("Failed to fetch transactions:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch transactions. Displaying cached data.' });
      setIsFetching(false);
    });

    return () => {
      unsubscribe();
    };
  }, [authLoading, user, toast]);

  const handleReferenceSearch = async () => {
    if (!referenceSearch) return;

    setIsSearchingByRef(true);
    setSearchAttempted(true);
    setFoundTransaction(null);
    try {
        const transactionsRef = ref(db, 'cashTransactions');
        const q = query(transactionsRef, orderByChild('reference'), equalTo(referenceSearch));
        const snapshot = await get(q);
        if (snapshot.exists()) {
            const fetchedList = snapshotToArray<CashTransaction>(snapshot);
            const accountMap = new Map(accounts.map(acc => [acc.id, acc.accountName]));
            const customerMap = new Map(customers.map(c => [c.id, c.name]));
            const transactionWithName = {
              ...fetchedList[0],
              ourAccountName: accountMap.get(fetchedList[0].accountUsedId) || 'Unknown Account',
              customerName: fetchedList[0].customerId ? (customerMap.get(fetchedList[0].customerId) || 'Unknown Customer') : fetchedList[0].accountName,
            }
            setFoundTransaction(transactionWithName);
        } else {
            setFoundTransaction(null);
        }
    } catch (error) {
        console.error("Failed to search by reference:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to search by reference.' });
    } finally {
        setIsSearchingByRef(false);
    }
  };

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
        originalTransactionId: transaction.id,
        tempImageDataUri: transaction.tempImageDataUri
    };
    
    addToCart(transactionAsProduct, 1);
    setCartCustomer({ name: transaction.customerName });

    toast({ title: 'Success', description: 'Transaction added to order.' });
    setSelectedTransaction(null);
  };
  
  const handleDeleteTransaction = (id: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }
    startDeleteTransition(async () => {
        try {
            await deleteCashTransactionAction(id, { userId: user.uid, userName: user.displayName || user.email! });
            await deleteItem('cashTransactions', id);
            toast({ title: 'Success', description: 'Transaction deleted successfully.' });
            setSelectedTransaction(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete transaction.' });
        }
    });
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
        const searchLower = debouncedSearch.toLowerCase();
        if (!searchLower) return true;
        return (
          t.reference.toLowerCase().includes(searchLower) ||
          t.customerName.toLowerCase().includes(searchLower) ||
          (t.message && t.message.toLowerCase().includes(searchLower))
        );
      })
      .filter(t => {
        if (!date?.from) return true;
        try {
          const txDate = new Date(t.transactionDate);
          if (isNaN(txDate.getTime())) return false; // Guard against invalid dates

          const fromDate = new Date(date.from);
          const toDate = date.to ? new Date(date.to) : new Date(date.from);
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(23, 59, 59, 999);

          return txDate >= fromDate && txDate <= toDate;
        } catch(e) {
            return false;
        }
      })
      .filter(t => type === 'all' || t.transactionType === type)
      .filter(t => method === 'all' || t.paymentMethod === method)
      .filter(t => accountUsed === 'all' || t.accountUsedId === accountUsed)
      .filter(t => status === 'all' || t.status === status);
  }, [debouncedSearch, date, transactionsWithNames, type, method, accountUsed, status]);

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
  }, [itemsPerPage, debouncedSearch, date, type, method, accountUsed, status]);

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
                <span className="font-semibold text-lg">₱{(overallReport?.cashOutTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
                <ArrowUp className="h-5 w-5" />
                <span className="font-semibold text-lg">₱{(overallReport?.cashInTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>
        <div className="text-sm text-muted-foreground">
            All-Time Transactions: <span className="font-semibold text-foreground">{(overallReport?.totalTransactions || 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-auto md:max-w-xs">
          <Input
            placeholder="Search by ref, name, message..."
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
                  <SelectItem value="Processing">Processing</SelectItem>
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
                const isValidDate = t.transactionDate && !isNaN(new Date(t.transactionDate).getTime());
                const displayDate = isValidDate ? new Date(t.transactionDate) : null;

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
                          {t.transactionType === 'Cash In' ? 'To: ' : 'From: '}
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
                              'bg-amber-500 hover:bg-amber-600': t.status === 'Processing',
                            }
                          )}
                        >
                          {t.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <div className="text-sm text-muted-foreground mb-1.5 h-4">
                         {isMounted && isValidDate ? format(new Date(t.transactionDate), 'PPp') : <Skeleton className="h-4 w-32" />}
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
                  const isValidDate = t.transactionDate && !isNaN(new Date(t.transactionDate).getTime());
                  return (
                    <TableRow key={t.id} onClick={() => setSelectedTransaction(t)} className="cursor-pointer">
                        <TableCell>
                          {isMounted && isValidDate ? format(new Date(t.transactionDate), 'PPp') : <Skeleton className="h-5 w-40" />}
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
                                  'bg-amber-500 hover:bg-amber-600': t.status === 'Processing',
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
      
       <Dialog open={isSearchOpen} onOpenChange={onSearchOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Search by Reference Number</DialogTitle>
                <DialogDescription>
                    Find a specific transaction by its reference number, regardless of date filters.
                </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
                <Input 
                    placeholder="Enter reference number..."
                    value={referenceSearch}
                    onChange={(e) => setReferenceSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleReferenceSearch()}
                />
                <Button onClick={handleReferenceSearch} disabled={isSearchingByRef}>
                    {isSearchingByRef ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
            </div>

            <div className="mt-4 min-h-[100px]">
                {isSearchingByRef ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : foundTransaction ? (
                     <div className="space-y-4">
                        <div
                            className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                                setSelectedTransaction(foundTransaction);
                                onSearchOpenChange(false);
                            }}
                        >
                            <div className="font-medium">{foundTransaction.accountName}</div>
                            <div className="text-sm text-muted-foreground">{foundTransaction.transactionType} - ₱{foundTransaction.amount.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(foundTransaction.transactionDate), 'PPp')}</div>
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => {
                                setSelectedTransaction(foundTransaction);
                                onSearchOpenChange(false);
                            }}
                        >
                            View Details
                        </Button>
                    </div>
                ) : searchAttempted ? (
                    <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                        <p>No transaction found with that reference.</p>
                    </div>
                ) : null}
            </div>
        </DialogContent>
      </Dialog>
      
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
                Transaction Date: {(() => {
                  if (!isMounted || !selectedTransaction.transactionDate) return 'Loading date...';
                  try {
                    const date = new Date(selectedTransaction.transactionDate);
                    if (!isNaN(date.getTime())) {
                      return format(date, 'PPpp');
                    }
                  } catch(e) {}
                  return "Invalid Date";
                })()}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] -mx-6">
              <div className="space-y-6 py-4 px-6">
                 {selectedTransaction.receiptImageUrl && (
                    <div>
                        <h4 className="font-semibold mb-2 text-muted-foreground">Receipt</h4>
                        <a href={selectedTransaction.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-muted rounded-md overflow-hidden border">
                            <Image src={selectedTransaction.receiptImageUrl} alt="Transaction Receipt" layout="fill" objectFit="contain" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <FileImage className="h-8 w-8 text-white" />
                            </div>
                        </a>
                    </div>
                )}
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
                                'bg-amber-500 hover:bg-amber-600': selectedTransaction.status === 'Processing',
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
                        <h4 className="font-semibold mb-2 text-muted-foreground">{selectedTransaction.transactionType === 'Cash In' ? 'To (Receiver)' : 'From (Sender)'}</h4>
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
                            {selectedTransaction.createdAt && isMounted && (
                              <div className="flex items-start gap-3">
                                <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                                <p className="text-muted-foreground">
                                  Created: {format(new Date(selectedTransaction.createdAt), 'PPp')}
                                </p>
                              </div>
                            )}
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
              <div className="flex gap-2 w-full sm:w-auto">
                <Button asChild variant="secondary" className="flex-1">
                  <Link href={`/admin/cashio/edit/${selectedTransaction.id}`}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                {!selectedTransaction.customerId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" disabled={isPendingDelete}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this transaction and reverse its impact on account balances and reports. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteTransaction(selectedTransaction.id)}
                          disabled={isPendingDelete}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {isPendingDelete ? 'Deleting...' : 'Confirm Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setSelectedTransaction(null)} className="w-full">Close</Button>
                {(selectedTransaction.status === 'Available' || selectedTransaction.status === 'Processing') && (
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
