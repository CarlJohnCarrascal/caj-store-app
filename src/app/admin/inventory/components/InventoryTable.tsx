
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { getProducts } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, History, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import StockAdjustmentForm from './StockAdjustmentForm';
import StockHistoryDialog from './StockHistoryDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const INVENTORY_FILTERS_KEY = 'inventoryFilters';

export default function InventoryTable() {
    const { activeStoreId } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter and Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('stock-asc');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Dialog State
    const [adjustStockProduct, setAdjustStockProduct] = useState<Product | null>(null);
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    
    useEffect(() => {
        const saved = localStorage.getItem(INVENTORY_FILTERS_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSearchTerm(parsed.searchTerm ?? '');
                setStockFilter(parsed.stockFilter ?? 'all');
                setSortOrder(parsed.sortOrder ?? 'stock-asc');
                setItemsPerPage(parsed.itemsPerPage ?? 15);
            } catch (e) {
                console.error('Failed to parse inventory filters', e);
            }
        }
    }, []);

    useEffect(() => {
        const toSave = { searchTerm, stockFilter, sortOrder, itemsPerPage };
        localStorage.setItem(INVENTORY_FILTERS_KEY, JSON.stringify(toSave));
    }, [searchTerm, stockFilter, sortOrder, itemsPerPage]);

    useEffect(() => {
        if (!activeStoreId) {
            setIsLoading(false);
            setProducts([]);
            return;
        }
        setIsLoading(true);
        getProducts(activeStoreId)
            .then(setProducts)
            .catch(err => console.error("Failed to fetch products:", err))
            .finally(() => setIsLoading(false));
    }, [activeStoreId]);

    const filteredAndSortedProducts = useMemo(() => {
        let results = [...products];

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            results = results.filter(p => p.name.toLowerCase().includes(lowercasedTerm) || p.barcode?.includes(lowercasedTerm));
        }

        switch (stockFilter) {
            case 'low':
                results = results.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 10));
                break;
            case 'critical':
                results = results.filter(p => p.stock <= (p.criticalStockThreshold ?? 5));
                break;
            case 'out':
                results = results.filter(p => p.stock <= 0);
                break;
        }
        
        results.sort((a, b) => {
            switch (sortOrder) {
                case 'stock-desc': return b.stock - a.stock;
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'stock-asc':
                default:
                    return a.stock - b.stock;
            }
        });

        return results;
    }, [products, searchTerm, stockFilter, sortOrder]);

    const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [currentPage, itemsPerPage, filteredAndSortedProducts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage, searchTerm, stockFilter]);

    if (isLoading) {
        return <Skeleton className="h-[500px] w-full" />;
    }

    return (
        <>
            <Card>
                <CardContent className="p-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="lg:col-span-2">
                             <label htmlFor="search" className="text-sm font-medium">Search Product</label>
                             <div className="relative">
                                <Input
                                    id="search"
                                    placeholder="Search by name or barcode..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                        <div>
                             <label htmlFor="stock-filter" className="text-sm font-medium">Stock Status</label>
                            <Select value={stockFilter} onValueChange={setStockFilter}>
                                <SelectTrigger id="stock-filter"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stock Levels</SelectItem>
                                    <SelectItem value="in-stock">In Stock</SelectItem>
                                    <SelectItem value="low">Low Stock</SelectItem>
                                    <SelectItem value="critical">Critical Stock</SelectItem>
                                    <SelectItem value="out">Out of Stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label htmlFor="sort-order" className="text-sm font-medium">Sort By</label>
                            <Select value={sortOrder} onValueChange={setSortOrder}>
                                <SelectTrigger id="sort-order"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stock-asc">Stock (Low to High)</SelectItem>
                                    <SelectItem value="stock-desc">Stock (High to Low)</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProducts.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>
                                    <Image src={p.image || 'https://placehold.co/64x64.png'} alt={p.name} width={48} height={48} className="rounded-md object-cover" />
                                </TableCell>
                                <TableCell>
                                    <p className="font-medium">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.category} / {p.group}</p>
                                </TableCell>
                                <TableCell>₱{p.cost?.toFixed(2) ?? 'N/A'}</TableCell>
                                <TableCell>₱{p.price.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant={p.stock <= (p.criticalStockThreshold ?? 5) ? 'destructive' : p.stock <= (p.lowStockThreshold ?? 10) ? 'secondary' : 'default'}>
                                        {p.stock} {p.unit}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" className="mr-2" onClick={() => setHistoryProduct(p)}><History className="mr-2 h-4 w-4"/>History</Button>
                                    <Button size="sm" onClick={() => setAdjustStockProduct(p)}><Truck className="mr-2 h-4 w-4"/>Update Stock</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {paginatedProducts.length === 0 && (
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No products match the current filters.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                )}
                <CardFooter className="flex justify-between items-center py-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {Math.min(itemsPerPage * currentPage, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} products.
                    </div>
                    <div className="flex items-center gap-2">
                         <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</Button>
                         <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>Next</Button>
                    </div>
                </CardFooter>
            </Card>

            {/* Dialog for Adjusting Stock */}
            <Dialog open={!!adjustStockProduct} onOpenChange={(open) => !open && setAdjustStockProduct(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Stock for {adjustStockProduct?.name}</DialogTitle>
                        <DialogDescription>
                            Record a stock-in, stock-out, or correction. Current stock: {adjustStockProduct?.stock}
                        </DialogDescription>
                    </DialogHeader>
                    {adjustStockProduct && (
                        <StockAdjustmentForm
                            product={adjustStockProduct}
                            onSuccess={() => {
                                setAdjustStockProduct(null);
                                // Re-fetch products to show updated stock
                                setIsLoading(true);
                                getProducts(activeStoreId!).then(setProducts).finally(() => setIsLoading(false));
                            }}
                            onCancel={() => setAdjustStockProduct(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog for Stock History */}
            {historyProduct && (
                 <StockHistoryDialog
                    product={historyProduct}
                    isOpen={!!historyProduct}
                    onOpenChange={(open) => !open && setHistoryProduct(null)}
                />
            )}
        </>
    );
}
