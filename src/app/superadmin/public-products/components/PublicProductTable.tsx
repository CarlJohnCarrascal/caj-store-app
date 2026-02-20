'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getPublicProducts, deletePublicProduct } from '@/lib/data';
import { deletePublicProductAction } from '@/lib/actions';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicProductTable() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    setIsLoading(true);
    getPublicProducts()
        .then(setProducts)
        .catch(err => toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch public products.' }))
        .finally(() => setIsLoading(false));
  }, [toast]);


  const handleDelete = (product: Product) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Action not allowed', description: 'You must be logged in.' });
        return;
    }
    startTransition(async () => {
      try {
        await deletePublicProduct(product.id, { userId: user.uid, userName: user.displayName || user.email! });
        await deletePublicProductAction();
        setProducts(prev => prev.filter(p => p.id !== product.id));
        toast({ title: 'Success', description: 'Public product deleted successfully.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete product.' });
      }
    });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Image</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Group</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length > 0 ? (
            products.map(product => (
            <TableRow key={product.id}>
                <TableCell>
                <div className="relative h-12 w-12 rounded-md overflow-hidden">
                    <Image src={product.image || 'https://placehold.co/48x48.png'} alt={product.name} fill sizes="48px" className="object-cover" data-ai-hint="product photo"/>
                </div>
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.group}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>₱{product.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="icon" asChild>
                    <Link href={`/superadmin/public-products/edit/${product.id}`}>
                        <Pencil className="h-4 w-4" />
                    </Link>
                    </Button>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the public product.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleDelete(product)}
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
                    No public products found.
                </TableCell>
            </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
