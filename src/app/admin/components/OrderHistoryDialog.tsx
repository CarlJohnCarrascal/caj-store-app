
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRecentOrdersByCategory } from '@/lib/data';
import { Order, CartItem } from '@/lib/types';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

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
  
  const filterItemsByCategory = (items: CartItem[]): CartItem[] => {
    if (category === 'Store') {
        return items.filter(item => !['Printing', 'E-loading', 'Other Service', 'CashIO', 'Financial'].includes(item.category));
    }
    return items.filter(item => item.category === category);
  }

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
              <Accordion type="multiple" className="w-full">
                {orders.map((order) => {
                  const relevantItems = filterItemsByCategory(order.items);
                  if (relevantItems.length === 0) return null;

                  return (
                  <AccordionItem value={order.id} key={order.id}>
                    <AccordionTrigger className="hover:no-underline group">
                       <div className="grid grid-cols-4 items-center w-full text-sm text-left pr-4">
                          <span>{format(new Date(order.createdAt), 'PPp')}</span>
                          <span className="truncate">{order.customerName}</span>
                          <span className="font-medium text-right">₱{order.total.toFixed(2)}</span>
                          <div className="flex justify-end items-center gap-2">
                             <Button asChild variant="link" size="sm" className="p-0 h-auto z-10 relative">
                                <Link href={`/admin/orders/${order.id}`} onClick={(e) => e.stopPropagation()}>View Full</Link>
                             </Button>
                             <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </div>
                       </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted/50 p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {relevantItems.map(item => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  )}
                )}
              </Accordion>
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
