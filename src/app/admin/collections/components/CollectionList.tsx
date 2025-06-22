'use client';

import { useMemo, useState, useTransition } from 'react';
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

interface CollectionListProps {
  collections: Collection[];
  customers: Customer[];
}

export default function CollectionList({ collections, customers }: CollectionListProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');

  const filteredCollections = useMemo(() => {
    return collections
      .filter(collection => {
        if (selectedCustomer === 'all') return true;
        return collection.customerId === selectedCustomer;
      })
      .filter(collection => {
        if (!searchTerm) return true;
        return collection.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [collections, searchTerm, selectedCustomer]);

  const handleCopy = (value: number) => {
    navigator.clipboard.writeText(String(value));
    toast({
      title: 'Copied to clipboard!',
      description: `Value ₱${value.toFixed(2)} has been copied.`,
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCollectionAction(id);
        toast({ title: 'Success', description: 'Collection deleted successfully.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete collection.' });
      }
    });
  };
  
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
                  <TableCell className="text-right font-mono">₱{collection.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
