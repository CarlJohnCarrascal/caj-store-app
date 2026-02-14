'use client';
import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { getStoreData, setStoreData } from '@/lib/offline';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/hooks/use-cart';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
  const items: (T & { id: string })[] = [];
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot: any) => {
      items.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
  }
  return items;
}

function ProductGridCard({ product }: { product: Product }) {
    const { addToCart } = useCart();
    return (
        <div className="bg-card p-4 rounded-lg flex flex-col items-center text-center transition-all hover:shadow-lg hover:ring-2 hover:ring-primary">
            <div className="relative w-24 h-24 mb-4">
                <Image src={product.image || 'https://placehold.co/100x100.png'} alt={product.name} fill sizes="100px" className="object-contain" />
            </div>
            <h3 className="font-semibold flex-grow">{product.name}</h3>
            <p className="text-lg font-bold mt-1">₱{product.price.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">In Stock: {product.stock}</p>
            <Button onClick={() => addToCart(product)} className="mt-4 w-full">Add</Button>
        </div>
    );
}

export default function PosProductsPage() {
    const { activeStoreId } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('all');

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

    const categories = useMemo(() => ['all', ...Array.from(new Set(products.map(p => p.category)))], [products]);
    
    const filteredProducts = useMemo(() => {
        if (categoryFilter === 'all') {
            return products;
        }
        return products.filter(p => p.category === categoryFilter);
    }, [products, categoryFilter]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h2 className="text-2xl font-bold">Products</h2>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {isLoading ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-48" />)}
                 </div>
            ) : (
                <div className="flex-grow overflow-auto pr-2 -mr-2">
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredProducts.map(product => <ProductGridCard key={product.id} product={product} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
