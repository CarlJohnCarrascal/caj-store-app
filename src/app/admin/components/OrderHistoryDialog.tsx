'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRecentOrdersByCategory } from '@/lib/data';
import { Order } from '@/lib/types';
import Link from 'next/link';

interface OrderHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: 'Store' | 'Printing' | 'E-loading' | 'Other Service';
}

export default function OrderHistoryDialog({ isOpen, onOpenChange, category }: OrderHistoryDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchHistory = async () => {
        setIsLoading(true);
        try {
          const recentOrders = await getRecentOrdersByCategory(category, 20);
          setOrders(recentOrders);
        } catch (error) {
          console.error(`Failed to fetch order history for ${category}:`, error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, category]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recent {category} Orders</DialogTitle>
          <DialogDescription>
            Showing the last 20 orders containing {category} items.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length > 0 ? (
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{format(new Date(order.createdAt), 'PPp')}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="text-right">₱{order.total.toFixed(2)}</TableCell>
                       <TableCell className="text-right">
                         <Link href={`/admin/orders/${order.id}`} className="text-primary hover:underline text-sm">View</Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              No recent orders found for this category.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
