
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Info, User, Wallet, Landmark, Hash, Clock, MessageSquare, ArrowUp, ArrowDown, FileImage } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRecentOrdersByCategory, getCashTransactionById } from '@/lib/data';
import { Order, CartItem, CashTransaction } from '@/lib/types';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Image from 'next/image';


interface OrderHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: 'Store' | 'Printing' | 'E-loading' | 'Other Service' | 'CashIO';
}

export default function OrderHistoryDialog({ isOpen, onOpenChange, category }: OrderHistoryDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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
  
  const formatDescription = (description?: string): string => {
    if (!description) return '-';
    // This will remove the " (Cost: ₱..., Fee: ₱...)" part
    return description.split(' (')[0].trim();
  }
  
  const handleViewDetails = async (transactionId: string) => {
    setIsFetchingDetails(true);
    try {
        const tx = await getCashTransactionById(transactionId);
        if (tx) {
            setSelectedTransaction(tx);
        } else {
            // handle error toast?
        }
    } catch (error) {
        console.error("Failed to fetch transaction details", error);
    } finally {
        setIsFetchingDetails(false);
    }
  };

  return (
    <>
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
                    
                    const relevantTotal = relevantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                    return (
                    <AccordionItem value={order.id} key={order.id}>
                      <AccordionTrigger className="hover:no-underline group">
                         <div className="grid grid-cols-2 md:grid-cols-4 items-center w-full text-sm text-left pr-4 gap-y-2 gap-x-4">
                            <div className="col-span-2 md:col-span-1">
                                <p className="font-medium">{order.customerName}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt), 'PPp')}</p>
                            </div>
                            <span className="font-semibold text-lg md:text-sm md:text-right md:font-medium">₱{relevantTotal.toFixed(2)}</span>
                            <div className="col-span-2 md:col-span-2 flex justify-end items-center gap-2">
                               <Button asChild variant="link" size="sm" className="p-0 h-auto z-10 relative">
                                  <Link href={`/admin/orders/${order.id}`} onClick={(e) => e.stopPropagation()}>View Full Order</Link>
                               </Button>
                            </div>
                         </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="bg-muted/50 p-4">
                           {category === 'CashIO' ? (
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                      <TableHead>Transaction</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {relevantItems.map(item => (
                                      <TableRow key={item.id}>
                                          <TableCell className="font-medium">{item.name.split(':')[0]}</TableCell>
                                          <TableCell>{formatDescription(item.description)}</TableCell>
                                          <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                                           <TableCell className="text-right">
                                            {item.originalTransactionId && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(item.originalTransactionId!)}
                                                    disabled={isFetchingDetails}
                                                >
                                                    <Info className="mr-2 h-3 w-3" />
                                                    Details
                                                </Button>
                                            )}
                                           </TableCell>
                                      </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                           ) : (
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                      <TableHead>Item</TableHead>
                                      {(category === 'E-loading' || category === 'Other Service') && <TableHead>Description</TableHead>}
                                      {category === 'Printing' && <TableHead>Dimensions</TableHead>}
                                      <TableHead>Quantity</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {relevantItems.map(item => (
                                      <TableRow key={item.id}>
                                          <TableCell className="font-medium">{item.name}</TableCell>
                                          {(category === 'E-loading' || category === 'Other Service') && <TableCell>{formatDescription(item.description)}</TableCell>}
                                          {category === 'Printing' && <TableCell>{item.dimensions !== 'N/A' ? item.dimensions : '-'}</TableCell>}
                                          <TableCell>{item.quantity}</TableCell>
                                          <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                                      </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                           )}
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

      <Dialog open={!!selectedTransaction} onOpenChange={(isOpen) => !isOpen && setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-md">
            {selectedTransaction && (
                <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {selectedTransaction.transactionType === 'Cash In' ? (
                        <ArrowUp className="h-6 w-6 text-green-600" />
                        ) : (
                        <ArrowDown className="h-6 w-6 text-red-600" />
                        )}
                        <span>{selectedTransaction.transactionType} Details</span>
                    </DialogTitle>
                    <DialogDescription>
                        {format(new Date(selectedTransaction.transactionDate), 'PPpp')}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] -mx-6">
                <div className="space-y-6 py-4 px-6">
                    {selectedTransaction.receiptImageUrl && (
                        <div>
                            <h4 className="font-semibold mb-2 text-muted-foreground">Receipt</h4>
                            <div
                                className="relative h-32 w-32 rounded-md overflow-hidden border-2 border-dashed cursor-pointer"
                                onClick={() => setIsImageModalOpen(true)}
                            >
                                <Image
                                    src={selectedTransaction.receiptImageUrl}
                                    alt="Transaction Receipt"
                                    fill
                                    sizes="128px"
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <FileImage className="h-8 w-8 text-white" />
                                </div>
                            </div>
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
                                {selectedTransaction.createdAt && (
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
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedTransaction(null)}>Close</Button>
                </DialogFooter>
                </>
            )}
        </DialogContent>
      </Dialog>
      
      {selectedTransaction?.receiptImageUrl && (
          <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
              <DialogHeader className="p-6 pb-0 flex-shrink-0">
                <DialogTitle>Receipt Preview</DialogTitle>
              </DialogHeader>
              <div className="relative flex-1 w-full h-full p-6 pt-2">
                <Image
                    src={selectedTransaction.receiptImageUrl}
                    alt="Transaction Receipt"
                    fill
                    className="object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
      )}
    </>
  );
}
