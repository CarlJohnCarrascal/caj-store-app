
'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import InventoryTable from './components/InventoryTable';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <InventoryTable />
      </Suspense>
    </div>
  );
}
