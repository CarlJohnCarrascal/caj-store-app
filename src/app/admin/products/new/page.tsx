
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductForm from '../ProductForm';
import { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function NewProductForm() {
  const searchParams = useSearchParams();
  const [initialProduct, setInitialProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    const barcode = searchParams.get('barcode');
    const defaults: Partial<Product> = {};
    if (barcode) {
      defaults.barcode = barcode;
    }
    setInitialProduct(defaults);
  }, [searchParams]);

  if (initialProduct === null) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return <ProductForm product={initialProduct as Product} />;
}


export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Product</h1>
      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <NewProductForm />
      </Suspense>
    </div>
  );
}
