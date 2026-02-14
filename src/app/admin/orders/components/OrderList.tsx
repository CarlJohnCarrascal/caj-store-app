
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { Order } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, onValue, query, limitToLast, orderByKey } from 'firebase/database';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Search, SlidersHorizontal, CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoreData, setStoreData } from '@/lib/offline';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const ADMIN_ORDERS_FILTERS_KEY = 'adminOrdersFilters';

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

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [settlementFilter, setSettlementFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_ORDERS_FILTERS_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setItemsPerPage(parsed.itemsPerPage ?? 10);
            setSearchTerm(parsed.searchTerm ?? '');
            setSettlementFilter(parsed.settlementFilter ?? 'all');
            setServiceFilter(parsed.serviceFilter ?? 'all');
            if (parsed.date?.from) {
                setDate({
                    from: new Date(parsed.date.from),
                    to: parsed.date.to ? new Date(parsed.date.to) : undefined,
                });
            }
        } catch (e) {
            console.error('Failed to parse order filters', e);
        }
    }
  }, []);

  useEffect(() => {
    const toSave = {
        itemsPerPage,
        searchTerm,
        settlementFilter,
        serviceFilter,
        date: date ? { from: date.from?.toISOString(), to: date.to?.toISOString() } : undefined,
    };
    localStorage.setItem(ADMIN_ORDERS_FILTERS_KEY, JSON.stringify(toSave));
  }, [itemsPerPage, searchTerm, settlementFilter, serviceFilter, date]);

  useEffect(() => {
    const loadFromCache = async () => {
        const cachedData = await getStoreData<Order>('orders');
        if (cachedData.length > 0) {
            const ordersWithDates = cachedData.map(o => ({...o, createdAt: new Date(o.createdAt)}));
            setOrders(ordersWithDates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
            setIsLoading(false);
        }
    };
    loadFromCache();
    
    const ordersRef = query(ref(db, 'orders'), orderByKey(), limitToLast(200)); // Fetch more for better client-side filtering
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const orderList = snapshotToArray<Order>(snapshot);
      const ordersWithDates = orderList.map(o => ({
        ...o,
        createdAt: new Date(o.createdAt),
      }));
      setOrders(ordersWithDates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setIsLoading(false);
      setStoreData('orders', orderList);
    }, (error) => {
        console.error("Firebase listener failed:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        if (settlementFilter === 'all') return true;
        return order.settlementType === settlementFilter;
      })
      .filter(order => {
        if (serviceFilter === 'all') return true;
        if (serviceFilter === 'Store') {
             return order.items.some(item => !['Printing', 'E-loading', 'Other Service', 'CashIO', 'Financial'].includes(item.category));
        }
        return order.items.some(item => item.category === serviceFilter);
      })
      .filter(order => {
        if (!searchTerm) return true;
        const lowercasedTerm = searchTerm.toLowerCase();
        return (
          order.customerName.toLowerCase().includes(lowercasedTerm) ||
          order.id.toLowerCase().includes(lowercasedTerm)
        );
      })
      .filter(order => {
        if (!date?.from) return true;
        try {
            const orderDate = new Date(order.createdAt);
            const fromDate = new Date(date.from);
            const toDate = date.to ? new Date(date.to) : new Date(date.from);
            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(23, 59, 59, 999);
            return orderDate >= fromDate && orderDate <= toDate;
        } catch (e) {
            return false;
        }
      });
  }, [orders, searchTerm, settlementFilter, serviceFilter, date]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, settlementFilter, serviceFilter, date]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead>
                <TableHead><Skeleton className="h-5 w-28" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
  
  if (orders.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <h3 className="text-xl font-semibold">No Orders Found</h3>
        <p className="text-muted-foreground mt-2">Processed orders will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters" className="border rounded-lg bg-card">
          <AccordionTrigger className="p-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              <span className="font-semibold">Filters & Search</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 pt-0 items-end">
                <div className="relative flex-grow w-full">
                  <Input
                    id="search"
                    placeholder="Search by customer or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
                <Select value={settlementFilter} onValueChange={setSettlementFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by settlement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Settlements</SelectItem>
                    <SelectItem value="pay_order">Paid</SelectItem>
                    <SelectItem value="add_to_balance">To Balance</SelectItem>
                  </SelectContent>
                </Select>
                 <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="Store">Store</SelectItem>
                    <SelectItem value="Printing">Printing</SelectItem>
                    <SelectItem value="CashIO">CashIO</SelectItem>
                    <SelectItem value="E-loading">E-loading</SelectItem>
                    <SelectItem value="Other Service">Other Service</SelectItem>
                  </SelectContent>
                </Select>
                <div>
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
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Settlement</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id}</TableCell>
                  <TableCell className="font-medium">{order.customerName}</TableCell>
                  <TableCell>{format(order.createdAt, 'PPp')}</TableCell>
                  <TableCell>
                    <Badge variant={order.settlementType === 'pay_order' ? 'default' : 'secondary'}>
                      {order.settlementType === 'pay_order' ? 'Paid' : 'To Balance'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">₱{order.total.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/orders/${order.id}`}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                  Showing {paginatedOrders.length} of {filteredOrders.length} orders.
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
                      onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">Page {currentPage} of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
              </div>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
