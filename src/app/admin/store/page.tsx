
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Product } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, equalTo, get } from 'firebase/database';
import ProductCard from '@/components/ProductCard';
import ProductListItem from '@/components/ProductListItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, LayoutGrid, List, SlidersHorizontal, ScanBarcode } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { getStoreData, setStoreData, getProductByBarcode } from '@/lib/offline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 10;

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

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showImages, setShowImages] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', group: 'all' });
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Load from cache first
    const loadFromCache = async () => {
      const cachedProducts = await getStoreData<Product>('products');
      if (cachedProducts.length > 0) {
        const visibleProducts = cachedProducts.filter(p => p.show).reverse();
        setProducts(visibleProducts);
        setIsLoading(false);
      }
    };
    loadFromCache();

    // Listen for live updates
    const productsRef = ref(db, 'products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const allProducts = snapshotToArray<Product>(snapshot);
      setStoreData('products', allProducts); // Update cache
      const visibleProducts = allProducts.filter(p => p.show).reverse();
      setProducts(visibleProducts);
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase listener failed:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const { categories, groups } = useMemo(() => {
    const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
    const groups = ['all', ...Array.from(new Set(products.map(p => p.group)))];
    return { categories, groups };
  }, [products]);
  
  const filteredAndSortedProducts = useMemo(() => {
    let results = [...products];

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
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return results;
  }, [searchTerm, filters, products, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredAndSortedProducts]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredAndSortedProducts]);
  
  const handleFilterChange = (filterType: 'category' | 'group') => (value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const onBarcodeScanned = async (barcode: string) => {
    setIsScannerOpen(false);
    const product = await getProductByBarcode(barcode);
    if (product) {
      addToCart(product);
      toast({
        title: 'Product Added to Order',
        description: `"${product.name}" was added to your order.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Product Not Found',
        description: `No product with barcode "${barcode}" found.`,
        action: (
          <Button asChild variant="secondary">
            <Link href={`/admin/products/new?barcode=${barcode}`}>Add Product</Link>
          </Button>
        ),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
         <Skeleton className="h-14 w-full" />
         <Skeleton className="h-14 w-full" />
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="aspect-square w-full" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                </div>
            ))}
         </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-grow">
            <Input
              placeholder="Search or scan barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
          <Button variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
            <ScanBarcode className="h-5 w-5" />
            <span className="sr-only">Scan Product</span>
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters" className="border rounded-lg bg-card">
          <AccordionTrigger className="p-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              <span className="font-semibold">Filters & View Options</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-center p-4 pt-0">
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full xl:w-auto">
                <Select onValueChange={handleFilterChange('category')} defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category === 'all' ? 'All Categories' : category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={handleFilterChange('group')} defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group} value={group}>{group === 'all' ? 'All Groups' : group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setSortOrder} defaultValue="name-asc">
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                        <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                    </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-images"
                    checked={showImages}
                    onCheckedChange={setShowImages}
                  />
                  <Label htmlFor="show-images" className="text-sm whitespace-nowrap">Show Images</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                    <LayoutGrid className="h-5 w-5" />
                    <span className="sr-only">Grid View</span>
                  </Button>
                  <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                    <List className="h-5 w-5" />
                    <span className="sr-only">List View</span>
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {paginatedProducts.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {paginatedProducts.map(product => (
                <ProductCard key={product.id} product={product} showImage={showImages} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedProducts.map(product => (
                <ProductListItem key={product.id} product={product} showImage={showImages} />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>

    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner onResult={onBarcodeScanned} onCancel={() => setIsScannerOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
