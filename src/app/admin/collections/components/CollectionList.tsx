'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { Collection, Customer } from '@/lib/types';
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
import { deleteCollectionAction } from '@/lib/actions';
import { Copy, Pencil, Trash2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getStoreData, setStoreData, deleteItem } from '@/lib/offline';

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

export default function CollectionList() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    let collectionsLoadedFromCache = false;
    let customersLoadedFromCache = false;
    
    const loadFromCache = async () => {
        const cachedCollections = await getStoreData<Collection>('collections');
        if (cachedCollections.length > 0) {
            setCollections(cachedCollections);
            collectionsLoadedFromCache = true;
        }

        const cachedCustomers = await getStoreData<Customer>('customers');
        if (cachedCustomers.length > 0) {
            setCustomers(cachedCustomers);
            customersLoadedFromCache = true;
        }

        if (collectionsLoadedFromCache && customersLoadedFromCache) {
            setIsLoading(false);
        }
    };
    loadFromCache();

    const collectionsRef = ref(db, 'collections');
    const customersRef = ref(db, 'customers');

    const unsubscribeCollections = onValue(collectionsRef, (snapshot) => {
        const collectionList = snapshotToArray<Collection>(snapshot);
        setCollections(collectionList);
        setStoreData('collections', collectionList);
        if (!customersLoadedFromCache) setIsLoading(false);
    }, (error) => {
        console.error("Firebase collections listener failed:", error);
        if (!customersLoadedFromCache) setIsLoading(false);
    });

    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
        const customerList = snapshotToArray<Customer>(snapshot);
        setCustomers(customerList);
        setStoreData('customers', customerList);
        if (!collectionsLoadedFromCache) setIsLoading(false);
    }, (error) => {
        console.error("Firebase customers listener failed:", error);
        if (!collectionsLoadedFromCache) setIsLoading(false);
    });

    return () => {
        unsubscribeCollections();
        unsubscribeCustomers();
    };
  }, []);

  const collectionsWithCustomerNames = useMemo(() => {
     if (isLoading && collections.length === 0) return [];
     const customerMap = new Map(customers.map(c => [c.id, c.name]));
     return collections.map(collection => ({
         ...collection,
         customerName: customerMap.get(collection.customerId) || 'Unknown Customer',
     }));
  }, [collections, customers, isLoading]);

  const filteredCollections = useMemo(() => {
    return collectionsWithCustomerNames
      .filter(collection => {
        if (selectedCustomer === 'all') return true;
        return collection.customerId === selectedCustomer;
      })
      .filter(collection => {
        if (!searchTerm) return true;
        return collection.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [collectionsWithCustomerNames, searchTerm, selectedCustomer]);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({
      title: 'Copied to clipboard!',
      description: `Value "${value}" has been copied.`,
    });
  };

  const handleDelete = (id: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to delete collections.' });
        return;
    }
    startTransition(async () => {
      try {
        await deleteCollectionAction(id, { userId: user.uid, userName: user.displayName || user.email! });
        await deleteItem('collections', id);
        toast({ title: 'Success', description: 'Collection deleted successfully.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete collection.' });
      }
    });
  };
  
  if (isLoading) {
    return (
       <Card>
            <Skeleton className="h-16 w-full" />
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-28" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                           <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                           </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
       </Card>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <h3 className="text-xl font-semibold">No Collections Found</h3>
        <p className="text-muted-foreground mt-2">Start by adding a new collection to track.</p>
         <Button asChild className="mt-4">
          <Link href="/admin/collections/new">
            Add Collection
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <div className="flex flex-col md:flex-row items-center justify-between border-b p-4 gap-4">
        <div className="relative flex-grow w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by collection name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Collection Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCollections.length > 0 ? (
              filteredCollections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell className="font-medium">{collection.name}</TableCell>
                  <TableCell>{collection.customerName}</TableCell>
                  <TableCell className="text-right font-mono">{collection.value}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={collection.note || ''}>{collection.note || '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                       <Button variant="ghost" size="icon" onClick={() => handleCopy(collection.value)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/collections/edit/${collection.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
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
                              This will permanently delete this collection record. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(collection.id)}
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
                <TableCell colSpan={5} className="h-24 text-center">
                  No collections match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
