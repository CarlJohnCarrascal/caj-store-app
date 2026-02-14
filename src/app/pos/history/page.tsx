'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Loader2, Search, SlidersHorizontal, CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getStoreData, setStoreData } from '@/lib/offline';
import { Order } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { ref, onValue, query, orderByKey } from 'firebase/database';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Card, CardFooter } from '@/components/ui/card';

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

export default function PosHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { activeStoreId } = useAuth();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [settlementFilter, setSettlementFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    if (!activeStoreId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const loadFromCache = async () => {
        const cachedData = await getStoreData<Order>('orders');
        if (cachedData.length > 0) {
            const ordersWithDates = cachedData.map(o => ({...o, createdAt: new Date(o.createdAt)}));
            setOrders(ordersWithDates);
            setIsLoading(false);
        }
    };
    loadFromCache();

    const ordersRef = query(ref(db, `storeData/${activeStoreId}/orders`), orderByKey());
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const orderList = snapshotToArray<Order>(snapshot);
      const ordersWithDates = orderList.map(o => ({...o, createdAt: new Date(o.createdAt)}));
      setOrders(ordersWithDates);
      setIsLoading(false);
      setStoreData('orders', orderList);
    }, (error) => {
        console.error("Firebase listener failed:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeStoreId]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => settlementFilter === 'all' || order.settlementType === settlementFilter)
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
        return order.customerName.toLowerCase().includes(lowercasedTerm) || order.id.toLowerCase().includes(lowercasedTerm);
      })
      .filter(order => {
        if (!date?.from) return true;
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(date.from);
        const toDate = date.to ? new Date(date.to) : new Date(date.from);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        return orderDate >= fromDate && orderDate <= toDate;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchTerm, settlementFilter, serviceFilter, date]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, settlementFilter, serviceFilter, date]);

  return (
    <div className="flex flex-col h-full space-y-6">
        <h1 className="text-3xl font-bold flex-shrink-0">Order History</h1>
        <Accordion type="single" collapsible className="w-full flex-shrink-0">
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
        <div className="flex-grow overflow-hidden rounded-lg border">
            {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            ) : paginatedOrders.length > 0 ? (
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-grow">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Settlement</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                           {paginatedOrders.map((order) => (
                               <TableRow key={order.id}>
                                  <TableCell>{format(new Date(order.createdAt), 'PPp')}</TableCell>
                                  <TableCell className="font-medium">{order.customerName}</TableCell>
                                  <TableCell>
                                      <Badge variant={order.settlementType === 'pay_order' ? 'default' : 'secondary'}>
                                      {order.settlementType === 'pay_order' ? 'Paid' : 'To Balance'}
                                      </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">₱{order.total.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">
                                      <Button asChild variant="outline" size="sm">
                                          <Link href={`/pos/orders/${order.id}`}>View</Link>
                                      </Button>
                                  </TableCell>
                              </TableRow>
                           ))}
                      </TableBody>
                  </Table>
              </ScrollArea>
              {totalPages > 1 && (
                  <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 border-t flex-shrink-0">
                      <div className="text-sm text-muted-foreground">
                          Showing {paginatedOrders.length} of {filteredOrders.length} orders.
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                              <span className="text-sm">Rows:</span>
                              <Select value={String(itemsPerPage)} onValueChange={v => setItemsPerPage(Number(v))}>
                                  <SelectTrigger className="w-20"><SelectValue/></SelectTrigger>
                                  <SelectContent>
                                      {[15, 30, 50].map(v => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Prev</Button>
                            <span className="text-sm">Page {currentPage} of {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages}>Next</Button>
                          </div>
                      </div>
                  </CardFooter>
              )}
            </div>
            ) : (
            <div className="text-center py-16 text-muted-foreground">
                <p>No orders found for the selected filters.</p>
            </div>
            )}
        </div>
    </div>
  );
}
