
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
import { CashTransaction, Account } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, ArrowUpDown, CalendarIcon, ArrowDown, ArrowUp, LayoutGrid, List } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CashTransactionTableProps {
  transactions: CashTransaction[];
  accounts: Account[];
}

export default function CashTransactionTable({ transactions: initialTransactions, accounts }: CashTransactionTableProps) {
  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [sort, setSort] = React.useState<{key: keyof CashTransaction | 'createdAt', order: 'asc' | 'desc'}>({ key: 'createdAt', order: 'desc' });
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [isMounted, setIsMounted] = React.useState(false);

  // Filtering state
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [type, setType] = React.useState('all');
  const [method, setMethod] = React.useState('all');
  const [accountUsed, setAccountUsed] = React.useState('all');
  const [status, setStatus] = React.useState('all');

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredTransactions = React.useMemo(() => {
    return transactions
      .filter(t => {
        const searchLower = search.toLowerCase();
        return (
          t.reference.toLowerCase().includes(searchLower) ||
          t.customerName.toLowerCase().includes(searchLower) ||
          t.message.toLowerCase().includes(searchLower)
        );
      })
      .filter(t => type === 'all' || t.transactionType === type)
      .filter(t => method === 'all' || t.paymentMethod === method)
      .filter(t => accountUsed === 'all' || t.accountUsedId === accountUsed)
      .filter(t => status === 'all' || t.status === status)
      .filter(t => {
        if (!date?.from) return true;
        const from = date.from;
        const to = date.to || from; // If no 'to' date, use 'from' for single day
        const transactionDate = t.createdAt;
        return transactionDate >= from && transactionDate <= new Date(to.getTime() + 86400000); // include the whole 'to' day
      });
  }, [search, transactions, date, type, method, accountUsed, status]);

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
      const aVal = a[sort.key as keyof CashTransaction];
      const bVal = b[sort.key as keyof CashTransaction];

      if (aVal === undefined || bVal === undefined) return 0;
      
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredTransactions, sort]);
  
  const handleSort = (key: keyof CashTransaction) => {
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
                    className={cn(
                      "justify-start text-left font-normal w-full col-span-2 md:col-span-1",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
                      <span>Pick a date range</span>
                    )}
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
        {viewMode === 'grid' ? (
           <div>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map(t => (
                <div key={t.id} className="border-b last:border-b-0">
                  <div className="grid grid-cols-2 gap-4 items-start p-4">
                    <div className="space-y-1.5">
                      <p className="font-mono text-base font-medium">{t.reference}</p>
                       <p className="text-sm text-muted-foreground">
                          {t.transactionType === 'Cash In' ? 'From: ' : 'To: '} 
                          {t.customerName} ({t.accountNumber})
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
                        {isMounted ? format(t.createdAt, 'M/d/yyyy, pp') : <Skeleton className="h-4 w-32" />}
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
              ))
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
                <Button variant="ghost" onClick={() => handleSort('createdAt')}>
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
                paginatedTransactions.map(t => (
                <TableRow key={t.id}>
                    <TableCell>
                      {isMounted ? format(t.createdAt, 'PPp') : <Skeleton className="h-5 w-40" />}
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
                ))
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
    </div>
  );
}
