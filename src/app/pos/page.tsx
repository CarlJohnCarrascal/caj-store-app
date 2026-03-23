'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Product } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, equalTo, get } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, LayoutGrid, List, SlidersHorizontal, ScanBarcode } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getStoreData, setStoreData, getProductByBarcode } from '@/lib/offline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const ITEMS_PER_PAGE = 24;

function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
  const items: (T & { id: string })[] = [];
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot: any) => {
      items.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
  }
  return items;
}

function ProductGridCard({ product, showImage, itemSize }: { product: Product, showImage: boolean, itemSize: number }) {
  const { addToCart } = useCart();

  const getSecondaryText = () => {
    if (product.category === 'Printing') return `/ Page`;
    if (product.unit === 'kg') return `/ kg`;
    if (product.stock > 0) return `• In Stock`;
    return '';
  }

  const titleSizeClasses = {
    1: 'text-xs',
    2: 'text-sm',
    3: 'text-sm',
    4: 'text-base',
    5: 'text-base',
  };

  const detailSizeClasses = {
    1: 'text-xs',
    2: 'text-xs',
    3: 'text-sm',
    4: 'text-sm',
    5: 'text-sm',
  };

  const paddingClasses = {
    1: 'p-2',
    2: 'p-3',
    3: 'p-4',
    4: 'p-4',
    5: 'p-5',
  }

  return (
    <div
      className="border shadow-sm rounded-lg flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary cursor-pointer group bg-card"
      onClick={() => addToCart(product)}
    >
      {showImage && (
        <div className="relative aspect-square w-full bg-white flex items-center justify-center p-2 rounded-t-lg">
          <Image
            src={product.image || 'https://placehold.co/400x400.png'}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-contain transition-transform group-hover:scale-105"
            data-ai-hint="product photo"
          />
        </div>
      )}
      <div className={cn("flex-grow flex flex-col justify-between", paddingClasses[itemSize as keyof typeof paddingClasses])}>
        <h3 className={cn("font-semibold text-card-foreground truncate", titleSizeClasses[itemSize as keyof typeof titleSizeClasses])}>{product.name}</h3>
        <p className={cn("text-muted-foreground", detailSizeClasses[itemSize as keyof typeof detailSizeClasses])}>
          ₱{product.price.toFixed(2)} {getSecondaryText()}
        </p>
      </div>
    </div>
  );
}

function ProductListItem({ product, showImage }: { product: Product, showImage: boolean }) {
  const { addToCart } = useCart();
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50">
      <div className="flex flex-col sm:flex-row items-center gap-6 p-4">
        {showImage && (
          <div className="relative h-32 w-full sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-md border">
            <Image
              src={product.image || 'https://placehold.co/128x128.png'}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 128px"
              className="object-cover"
              data-ai-hint="product photo"
            />
          </div>
        )}
        <div className="flex-grow text-center sm:text-left">
          <h3 className="text-xl font-bold">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{product.category} / {product.group}</p>
          <p className="mt-2 text-sm text-foreground line-clamp-2">{product.description}</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 flex-shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
          <p className="text-xl font-bold text-primary">
            ₱{product.price.toFixed(2)}
            {product.unit === 'kg' && <span className="text-sm font-normal text-muted-foreground"> / kg</span>}
          </p>
          <Button size="sm" onClick={() => addToCart(product)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add to Order
          </Button>
        </div>
      </div>
    </Card>
  );
}


const POS_PRODUCTS_FILTERS_KEY = 'posProductsFilters';

export default function PosProductsPage() {
  const { activeStoreId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showImages, setShowImages] = useState(true);
  const [filters, setFilters] = useState({ category: 'all', group: 'all' });
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isNotFoundDialogOpen, setIsNotFoundDialogOpen] = useState(false);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [itemSize, setItemSize] = useState(3);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isFiltersLoaded, setIsFiltersLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(POS_PRODUCTS_FILTERS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSearchTerm(parsed.searchTerm ?? '');
        setViewMode(parsed.viewMode ?? 'grid');
        setShowImages(parsed.showImages ?? true);
        setFilters(parsed.filters ?? { category: 'all', group: 'all' });
        setSortOrder(parsed.sortOrder ?? 'name-asc');
        setItemSize(parsed.itemSize ?? 3);
      } catch (e) {
        console.error('Failed to parse POS product filters', e);
      }
    }
    setIsFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (!isFiltersLoaded) return;
    const toSave = { searchTerm, viewMode, showImages, filters, sortOrder, itemSize };
    localStorage.setItem(POS_PRODUCTS_FILTERS_KEY, JSON.stringify(toSave));
  }, [searchTerm, viewMode, showImages, filters, sortOrder, itemSize, isFiltersLoaded]);

  useEffect(() => {
    if (!activeStoreId) {
      setIsLoading(false);
      setProducts([]);
      return;
    }
    setIsLoading(true);

    const loadFromCache = async () => {
      const cachedProducts = await getStoreData<Product>('products');
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts.filter(p => p.show));
        setIsLoading(false);
      }
    };
    loadFromCache();

    const productsRef = ref(db, `storeData/${activeStoreId}/products`);
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const allProducts = snapshotToArray<Product>(snapshot);
      setStoreData('products', allProducts);
      setProducts(allProducts.filter(p => p.show));
      setIsLoading(false);
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
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'name-desc': return b.name.localeCompare(b.name);
        case 'name-asc': default: return a.name.localeCompare(b.name);
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
    if (!activeStoreId) return;
    setIsScannerOpen(false);
    const product = await getProductByBarcode(activeStoreId, barcode);
    if (product) {
      addToCart(product);
      toast({ title: 'Product Added', description: `"${product.name}" added to order.` });
    } else {
      setNotFoundBarcode(barcode);
      setIsNotFoundDialogOpen(true);
    }
  };

  const sizeClasses = {
    1: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8', // Extra Small
    2: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7', // Small
    3: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', // Default
    4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', // Large
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', // Extra Large
  };

  const gridClassName = `${sizeClasses[itemSize as keyof typeof sizeClasses]} gap-6`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-2 mb-6 flex-shrink-0">
        <div className="relative flex-grow">
          <Input
            placeholder="Search or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-12 px-3" onClick={() => setIsScannerOpen(true)}>
            <ScanBarcode className="h-6 w-6" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Scan</span>
          </Button>
          <Button variant="outline" className="h-12 px-3" onClick={() => setIsFilterModalOpen(true)}>
            <SlidersHorizontal className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Filters</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={`grid ${gridClassName}`}>
          {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <>
          <div className="flex-grow overflow-auto pr-2 -mr-2">
            {paginatedProducts.length > 0 ? (
              viewMode === 'grid' ? (
                <div className={`grid ${gridClassName}`}>
                  {paginatedProducts.map(product => <ProductGridCard key={product.id} product={product} showImage={showImages} itemSize={itemSize} />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedProducts.map(product => (
                    <ProductListItem key={product.id} product={product} showImage={showImages} />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground">No products found</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>Next</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filters & View Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={handleFilterChange('category')} defaultValue={filters.category}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category === 'all' ? 'All Categories' : category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select onValueChange={handleFilterChange('group')} defaultValue={filters.group}>
                <SelectTrigger><SelectValue placeholder="All Groups" /></SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group} value={group}>{group === 'all' ? 'All Groups' : group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select onValueChange={setSortOrder} defaultValue={sortOrder}>
                <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                  <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="show-images" className="text-sm font-medium">Show Images</Label>
              <Switch
                id="show-images"
                checked={showImages}
                onCheckedChange={setShowImages}
              />
            </div>
            <div className="space-y-2">
              <Label>View Mode</Label>
              <div className="flex items-center gap-2">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} onClick={() => setViewMode('grid')} className="flex-1"><LayoutGrid className="mr-2 h-4 w-4" />Grid</Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} onClick={() => setViewMode('list')} className="flex-1"><List className="mr-2 h-4 w-4" />List</Button>
              </div>
            </div>
            <div className="space-y-4">
              <Label htmlFor="item-size-slider" className="text-sm font-medium">Grid Item Size</Label>
              <Slider
                id="item-size-slider"
                defaultValue={[itemSize]}
                min={1}
                max={5}
                step={1}
                onValueChange={(value) => setItemSize(value[0])}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <BarcodeScanner onResult={onBarcodeScanned} onCancel={() => setIsScannerOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isNotFoundDialogOpen} onOpenChange={setIsNotFoundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Product Not Found</AlertDialogTitle>
            <AlertDialogDescription>
              No product with barcode "{notFoundBarcode}" was found. Would you like to add it now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href={`/admin/products/new?barcode=${notFoundBarcode}`}>Add Product</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
