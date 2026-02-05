
'use client';

import StoreManager from './components/StoreManager';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function StoresPage() {
  const { loading } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Stores</h1>
      </div>
      {loading ? (
        <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <StoreManager />
      )}
    </div>
  );
}
