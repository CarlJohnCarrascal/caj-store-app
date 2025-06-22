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
import { Search, SlidersHorizontal, ArrowUpDown, CalendarIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

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

  // Filtering state
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [type, setType] = React.useState('all');
  const [method, setMethod] = React.useState('all');
  const [accountUsed, setAccountUsed] = React.useState('all');
  const [status, setStatus] = React.useState('all');

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 pt-0">
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal w-full",
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
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>


      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('createdAt')}>
                  Date <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Customer / Account</TableHead>
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
                    <TableCell>{format(t.createdAt, 'PPp')}</TableCell>
                    <TableCell>
                        <Badge className={t.transactionType === 'Cash In' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                            {t.transactionType}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{t.customerName}</div>
                        <div className="text-sm text-muted-foreground">{t.accountName} - {t.accountNumber}</div>
                    </TableCell>
                    <TableCell>{t.reference}</TableCell>
                    <TableCell className='text-right font-mono'>₱{t.amount.toFixed(2)}</TableCell>
                    <TableCell>
                        <Badge variant={t.status === 'Completed' ? 'default' : t.status === 'Cancelled' ? 'destructive' : 'secondary'}>
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
