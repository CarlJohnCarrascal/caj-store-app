
'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Product, StockHistoryEntry } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface StockHistoryDialogProps {
  product: Product;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function StockHistoryDialog({ product, isOpen, onOpenChange }: StockHistoryDialogProps) {

  const sortedHistory = useMemo(() => {
    if (!product.history) return [];
    return Object.values(product.history).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [product.history]);
  
  const typeColors: Record<StockHistoryEntry['type'], string> = {
    'initial': 'bg-sky-500',
    'stock-in': 'bg-green-500',
    'stock-out': 'bg-orange-500',
    'sale': 'bg-blue-500',
    'return': 'bg-purple-500',
    'correction': 'bg-yellow-500 text-black',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Stock History for {product.name}</DialogTitle>
          <DialogDescription>View all stock movements for this product.</DialogDescription>
        </DialogHeader>
        <div className="h-[60vh]">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Change</TableHead>
                  <TableHead className="text-center">New Stock</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHistory.length > 0 ? sortedHistory.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span title={format(new Date(entry.timestamp), 'PPpp')}>{formatDistanceToNow(new Date(entry.timestamp))} ago</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), 'MMM d, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(typeColors[entry.type])}>{entry.type}</Badge>
                    </TableCell>
                    <TableCell className={cn("text-center font-semibold", entry.quantityChange > 0 ? 'text-green-500' : 'text-red-500')}>
                        {entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange}
                    </TableCell>
                    <TableCell className="text-center font-bold">{entry.newStock}</TableCell>
                    <TableCell>{entry.user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.notes || '-'}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No history found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
