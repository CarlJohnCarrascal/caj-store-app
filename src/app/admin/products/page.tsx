
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Store } from 'lucide-react';
import ProductTable from './ProductTable';
import { useAuth } from '@/hooks/use-auth';

export default function AdminPage() {
  const { activeStore } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Products {activeStore ? `for ${activeStore.name}` : ''}</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>
      {activeStore ? (
        <ProductTable />
      ) : (
        <div className="text-center p-8 border rounded-lg">
          <Store className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold mt-4">No Store Selected</h3>
          <p className="text-muted-foreground mt-2">Please create or select a store to manage products.</p>
           <Button asChild className="mt-4">
            <Link href="/admin/stores">
              Manage Stores
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
