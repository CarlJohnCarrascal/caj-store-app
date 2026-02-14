'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRecentOrdersByCategory } from '@/lib/data';
import { Order } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

export default function PosHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { activeStoreId } = useAuth();

  useEffect(() => {
    if (activeStoreId) {
      const fetchHistory = async () => {
        setIsLoading(true);
        try {
          const recentOrders = await getRecentOrdersByCategory(activeStoreId, 'all', 50); // Fetch more for a page view
          setOrders(recentOrders);
        } catch (error) {
          console.error(`Failed to fetch order history:`, error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [activeStoreId]);

  return (
    <div className="flex flex-col h-full">
        <h1 className="text-3xl font-bold mb-6 flex-shrink-0">Order History</h1>
        <div className="flex-grow overflow-hidden rounded-lg border">
            {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            ) : orders.length > 0 ? (
            <ScrollArea className="h-full">
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
                         {orders.map((order) => (
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
            ) : (
            <div className="text-center py-16 text-muted-foreground">
                No recent orders found.
            </div>
            )}
        </div>
    </div>
  );
}
