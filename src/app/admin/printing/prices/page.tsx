
'use client';

import { Suspense } from 'react';
import PrintingPriceList from './components/PrintingPriceList';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrintingPricesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Printing Prices</h1>
      </div>
       <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PrintingPriceList />
      </Suspense>
    </div>
  );
}
