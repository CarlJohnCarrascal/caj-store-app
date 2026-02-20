'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import PublicProductTable from './components/PublicProductTable';

export default function PublicProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Public Products</h1>
        <Button asChild>
          <Link href="/admin/public-products/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Public Product
          </Link>
        </Button>
      </div>
      <PublicProductTable />
    </div>
  );
}
