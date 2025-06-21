'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Product } from '@/lib/types';
import { useCart } from '@/hooks/use-cart';
import { Plus } from 'lucide-react';

interface ProductListItemProps {
  product: Product;
}

export default function ProductListItem({ product }: ProductListItemProps) {
  const { addToCart } = useCart();

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50">
      <div className="flex flex-col sm:flex-row items-center gap-6 p-4">
        <div className="relative h-32 w-full sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-md border">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 128px"
            className="object-cover"
            data-ai-hint="product photo"
          />
        </div>
        <div className="flex-grow text-center sm:text-left">
          <h3 className="text-xl font-bold">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{product.category} / {product.group}</p>
          <p className="mt-2 text-sm text-foreground line-clamp-2">{product.description}</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 flex-shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
          <p className="text-xl font-bold text-primary">
            ${product.price.toFixed(2)}
            {product.unit === 'kg' && <span className="text-sm font-normal text-muted-foreground"> / kg</span>}
          </p>
          <Button size="sm" onClick={() => addToCart(product)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}
