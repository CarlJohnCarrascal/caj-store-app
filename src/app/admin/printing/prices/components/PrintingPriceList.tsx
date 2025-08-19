
'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import { PrintingPrice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deletePrintingPriceAction } from '@/lib/actions';
import { Pencil, Trash2, PlusCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getStoreData, setStoreData, deleteItem } from '@/lib/offline';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import PrintingPriceForm from './PrintingPriceForm';

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

export default function PrintingPriceList() {
  const [prices, setPrices] = useState<PrintingPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PrintingPrice | undefined>(undefined);

  useEffect(() => {
    const loadFromCache = async () => {
      const cachedData = await getStoreData<PrintingPrice>('printingPrices');
      if (cachedData.length > 0) {
        setPrices(cachedData);
        setIsLoading(false);
      }
    };
    loadFromCache();
    
    const pricesRef = ref(db, 'printingPrices');
    const unsubscribe = onValue(pricesRef, (snapshot) => {
      const priceList = snapshotToArray<PrintingPrice>(snapshot);
      setPrices(priceList);
      setIsLoading(false);
      setStoreData('printingPrices', priceList);
    }, (error) => {
      console.error("Firebase listener failed:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => a.service.localeCompare(b.service) || a.size.localeCompare(b.size));
  }, [prices]);

  const handleDelete = (id: string) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to delete prices.' });
      return;
    }
    startTransition(async () => {
      try {
        await deletePrintingPriceAction(id, { userId: user.uid, userName: user.displayName || user.email! });
        await deleteItem('printingPrices', id);
        toast({ title: 'Success', description: 'Printing price deleted successfully.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete price.' });
      }
    });
  };
  
  const handleEdit = (price: PrintingPrice) => {
      setEditingPrice(price);
      setIsFormOpen(true);
  }

  const handleAddNew = () => {
      setEditingPrice(undefined);
      setIsFormOpen(true);
  }

  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingPrice(undefined);
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }
  
  return (
    <>
    <Card>
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-xl font-semibold">Printing Prices</h2>
        <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Price
        </Button>
      </div>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPrices.length > 0 ? (
              sortedPrices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium">{price.service}</TableCell>
                  <TableCell>{price.size}</TableCell>
                  <TableCell>{price.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{price.notes || '-'}</TableCell>
                  <TableCell className="text-right font-mono">₱{price.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(price)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this price. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(price.id)}
                              disabled={isPending}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {isPending ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No printing prices defined.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingPrice ? 'Edit Price' : 'Create New Price'}</DialogTitle>
                <DialogDescription>Define a price for a specific printing service, size, and type.</DialogDescription>
            </DialogHeader>
            <PrintingPriceForm 
                price={editingPrice} 
                onSuccess={onFormSuccess} 
                onCancel={() => setIsFormOpen(false)}
            />
        </DialogContent>
    </Dialog>
    </>
  );
}
