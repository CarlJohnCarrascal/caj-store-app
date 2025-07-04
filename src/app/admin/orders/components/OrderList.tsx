'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
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
import { ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoreData, setStoreData } from '@/lib/offline';

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
    
    const ordersRef = query(ref(db, 'orders'), orderByKey(), limitToLast(100));
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

  const totalPages = Math.ceil(orders.length / itemsPerPage);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return orders.slice(startIndex, startIndex + itemsPerPage);
  }, [orders, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

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
                <TableCell>{format(order.createdAt, 'PPpp')}</TableCell>
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
                Showing {Math.min(itemsPerPage * currentPage, orders.length)} of {orders.length} orders.
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
  );
}
