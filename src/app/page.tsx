'use client';

import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/lib/types';
import { getProducts } from '@/lib/data';
import ProductCard from '@/components/ProductCard';
import ProductListItem from '@/components/ProductListItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, LayoutGrid, List } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({ category: 'all', group: 'all' });

  useEffect(() => {
    const fetchProducts = async () => {
      const prods = await getProducts();
      const visibleProducts = prods.filter(p => p.show);
      setProducts(visibleProducts);
      setFilteredProducts(visibleProducts);
    };
    fetchProducts();
  }, []);

  const { categories, groups } = useMemo(() => {
    const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
    const groups = ['all', ...Array.from(new Set(products.map(p => p.group)))];
    return { categories, groups };
  }, [products]);

  useEffect(() => {
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
        product.category.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    setFilteredProducts(results);
  }, [searchTerm, filters, products]);
  
  const handleFilterChange = (filterType: 'category' | 'group') => (value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
        <div className="relative w-full md:w-auto md:max-w-xs">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 bg-card border rounded-lg">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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
      
      {filteredProducts.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map(product => (
              <ProductListItem key={product.id} product={product} />
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
  );
}
