
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
import { Pencil, Trash2, Search, SlidersHorizontal, ScanBarcode } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { deleteProductAction } from '@/lib/actions';
import { useState, useEffect, useTransition, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getStoreData, setStoreData, deleteItem, deleteProduct, logActivity } from '@/lib/offline';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BarcodeScanner from '@/components/BarcodeScanner';

const ADMIN_PRODUCTS_FILTERS_KEY = 'adminProductsFilters';

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

export default function ProductTable() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, activeStoreId } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: 'all', group: 'all' });
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_PRODUCTS_FILTERS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSearchTerm(parsed.searchTerm ?? '');
        setFilters(parsed.filters ?? { category: 'all', group: 'all' });
        setSortOrder(parsed.sortOrder ?? 'name-asc');
      } catch (e) {
        console.error('Failed to parse product filters', e);
      }
    }
  }, []);

  useEffect(() => {
    const toSave = { searchTerm, filters, sortOrder };
    localStorage.setItem(ADMIN_PRODUCTS_FILTERS_KEY, JSON.stringify(toSave));
  }, [searchTerm, filters, sortOrder]);

  useEffect(() => {
    if (!activeStoreId) {
        setIsLoading(false);
        setProducts([]);
        return;
    };
    setIsLoading(true);

    const loadFromCache = async () => {
      const cachedProducts = await getStoreData<Product>('products');
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts);
        setIsLoading(false);
      }
    };
    loadFromCache();

    const productsRef = ref(db, `storeData/${activeStoreId}/products`);
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const productList = snapshotToArray<Product>(snapshot);
      setProducts(productList);
      setIsLoading(false);
      setStoreData('products', productList);
    }, (error) => {
      console.error("Firebase listener failed:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeStoreId]);

  const { categories, groups } = useMemo(() => {
    const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
    const groups = ['all', ...Array.from(new Set(products.map(p => p.group)))];
    return { categories, groups };
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let results = [...products].reverse(); // Show newest first by default before sorting

    if (filters.category !== 'all') {
      results = results.filter(product => product.category === filters.category);
    }
    
    if (filters.group !== 'all') {
      results = results.filter(product => product.group === filters.group);
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      results = results.filter(product =>
        product.name.toLowerCase().includes(lowercasedTerm) ||
        product.group.toLowerCase().includes(lowercasedTerm) ||
        product.category.toLowerCase().includes(lowercasedTerm) ||
        product.barcode?.includes(lowercasedTerm)
      );
    }
    
    results.sort((a, b) => {
      switch (sortOrder) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return results;
  }, [searchTerm, filters, products, sortOrder]);
  
  const handleFilterChange = (filterType: 'category' | 'group') => (value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handleDelete = (product: Product) => {
    if (!user || !activeStoreId) {
        toast({ variant: 'destructive', title: 'Action not allowed', description: 'You must be logged in and have an active store.' });
        return;
    }
    startTransition(async () => {
      try {
        await deleteProduct(activeStoreId, product.id);
        await logActivity({
          type: 'Product',
          action: 'Deleted',
          details: `Product "${product.name}" was deleted.`,
          targetId: product.id,
          userId: user.uid,
          userName: user.displayName || user.email!,
        });
        await deleteProductAction();
        await deleteItem('products', product.id);
        toast({ title: 'Success', description: 'Product deleted successfully.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete product.' });
      }
    });
  };

  const onBarcodeScanned = (barcode: string) => {
    setSearchTerm(barcode);
    setIsScannerOpen(false);
    toast({ title: 'Barcode Scanned!', description: `Searching for: ${barcode}` });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
        <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="sm:col-span-2 md:col-span-1">
                    <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <Input
                          placeholder="Search products..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                          />
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
                          <ScanBarcode className="h-5 w-5" />
                          <span className="sr-only">Scan Barcode</span>
                        </Button>
                    </div>
                </div>
                <Select onValueChange={handleFilterChange('category')} defaultValue="all">
                  <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category === 'all' ? 'All Categories' : category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={handleFilterChange('group')} defaultValue="all">
                  <SelectTrigger><SelectValue placeholder="All Groups" /></SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group} value={group}>{group === 'all' ? 'All Groups' : group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setSortOrder} defaultValue="name-asc">
                    <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                        <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </Card>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map(product => (
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
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                    <Badge variant={product.show ? 'default' : 'secondary'}>
                        {product.show ? 'Visible' : 'Hidden'}
                    </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="icon" asChild>
                        <Link href={`/admin/products/edit/${product.id}`}>
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
                                This action cannot be undone. This will permanently delete the product.
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
                    <TableCell colSpan={8} className="h-24 text-center">
                        No products found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner onResult={onBarcodeScanned} onCancel={() => setIsScannerOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
