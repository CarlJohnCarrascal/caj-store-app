
'use client';

import { getProductById } from '@/lib/data';
import ProductForm from '../../ProductForm';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchProduct() {
      try {
        const productData = await getProductById(id);
        if (!productData) {
          notFound();
          return;
        }
        setProduct(productData);
      } catch (err: any) {
        setError("Failed to load product data. You may not have permission to view this page.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6"><Skeleton className="h-9 w-64" /></h1>
        <Card>
          <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-[500px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error || !product) {
    return (
      <Card className="mt-4 border-destructive">
        <CardHeader><h1 className="text-destructive">An Error Occurred</h1></CardHeader>
        <CardContent><p>{error || "Product not found."}</p></CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Product</h1>
      <ProductForm product={product} />
    </div>
  );
}
