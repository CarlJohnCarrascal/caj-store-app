
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, ScanBarcode } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getStoreData, setStoreData, getProductByBarcode } from '@/lib/offline';
import Link from 'next/link';
import { Slider } from '@/components/ui/slider';

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

function ProductGridCard({ product, showImage }: { product: Product, showImage: boolean }) {
    const { addToCart } = useCart();

    const getSecondaryText = () => {
        if (product.category === 'Printing') return `/ Page`;
        if (product.unit === 'kg') return `/ kg`;
        if (product.stock > 0) return `• In Stock`;
        return '';
    }

    return (
        <div 
            className="rounded-lg flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary cursor-pointer group bg-card"
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
            <div className="p-3 flex-grow flex flex-col justify-between">
                <h3 className="font-semibold text-card-foreground truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground">
                    ₱{product.price.toFixed(2)} {getSecondaryText()}
                </p>
            </div>
        </div>
    );
}

export default function PosProductsPage() {
    const { activeStoreId } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
                case 'name-desc': return b.name.localeCompare(a.name);
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
            <Accordion type="single" collapsible className="w-full mb-6 flex-shrink-0">
                <AccordionItem value="filters" className="border rounded-lg bg-card">
                    <AccordionTrigger className="p-4 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5" />
                            <span className="font-semibold">Search, Filter & View Options</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                         <div className="flex flex-col xl:flex-row gap-4 justify-between items-center p-4 pt-0">
                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center w-full xl:w-auto">
                                <div className="relative flex-grow w-full sm:w-auto">
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

                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center w-full xl:w-auto">
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

                            <div className="flex items-center gap-6">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                    id="show-images"
                                    checked={showImages}
                                    onCheckedChange={setShowImages}
                                    />
                                    <Label htmlFor="show-images" className="text-sm whitespace-nowrap">Show Images</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="item-size-slider" className="text-sm whitespace-nowrap">Size</Label>
                                    <Slider
                                        id="item-size-slider"
                                        defaultValue={[itemSize]}
                                        min={1}
                                        max={5}
                                        step={1}
                                        onValueChange={(value) => setItemSize(value[0])}
                                        className="w-[100px]"
                                    />
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
            {isLoading ? (
                 <div className={`grid ${gridClassName}`}>
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-48" />)}
                 </div>
            ) : (
                <>
                <div className="flex-grow overflow-auto pr-2 -mr-2">
                     {paginatedProducts.length > 0 ? (
                        <div className={`grid ${gridClassName}`}>
                            {paginatedProducts.map(product => <ProductGridCard key={product.id} product={product} showImage={showImages} />)}
                        </div>
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
