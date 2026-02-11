
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
import { Pencil, Trash2, PlusCircle, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getStoreData, setStoreData, deleteItem } from '@/lib/offline';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import PrintingPriceForm from './PrintingPriceForm';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deletePrintingPrice, logActivity } from '@/lib/data';

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
  const { user, activeStoreId } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PrintingPrice | undefined>(undefined);
  
  const [serviceFilter, setServiceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sizeSearch, setSizeSearch] = useState('');

  useEffect(() => {
    if (!activeStoreId) {
      setIsLoading(false);
      return;
    }
    const loadFromCache = async () => {
      const cachedData = await getStoreData<PrintingPrice>('printingPrices');
      if (cachedData.length > 0) {
        setPrices(cachedData);
        setIsLoading(false);
      }
    };
    loadFromCache();
    
    const pricesRef = ref(db, `storeData/${activeStoreId}/printingPrices`);
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
  }, [activeStoreId]);
  
  const services = useMemo(() => ['all', ...new Set(prices.map(p => p.service))], [prices]);
  const types = ['all', 'Color', 'Black & White', 'N/A'];

  const filteredAndSortedPrices = useMemo(() => {
    return prices
      .filter(price => serviceFilter === 'all' || price.service === serviceFilter)
      .filter(price => typeFilter === 'all' || price.type === typeFilter)
      .filter(price => !sizeSearch || price.size.toLowerCase().includes(sizeSearch.toLowerCase()))
      .sort((a, b) => a.service.localeCompare(b.service) || a.size.localeCompare(b.size));
  }, [prices, serviceFilter, typeFilter, sizeSearch]);

  const handleDelete = (price: PrintingPrice) => {
    if (!user || !activeStoreId) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to delete prices.' });
      return;
    }
    startTransition(async () => {
      try {
        await deletePrintingPrice(activeStoreId, price.id);
        await logActivity({
          type: 'PrintingPrice',
          action: 'Deleted',
          details: `Printing price for ${price.service} (${price.size}) was deleted.`,
          targetId: price.id,
          userId: user.uid,
          userName: user.displayName || user.email!,
        });
        await deletePrintingPriceAction();
        await deleteItem('printingPrices', price.id);
        toast({ title: 'Success', description: 'Printing price deleted successfully.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete price.' });
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
      <CardHeader>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Printing Prices</h2>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <div className="relative flex-grow w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by size..."
                        value={sizeSearch}
                        onChange={(e) => setSizeSearch(e.target.value)}
                        className="pl-9 w-full"
                    />
                </div>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by service" />
                    </SelectTrigger>
                    <SelectContent>
                        {services.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Services' : s}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                         {types.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'All Types' : t}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={handleAddNew} className="w-full sm:w-auto flex-shrink-0">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New
                </Button>
            </div>
        </div>
      </CardHeader>
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
            {filteredAndSortedPrices.length > 0 ? (
              filteredAndSortedPrices.map((price) => (
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
                              onClick={() => handleDelete(price)}
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
                  No printing prices found for the selected filters.
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

      
