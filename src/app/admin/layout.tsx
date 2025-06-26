'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authEnabled && !loading && !user) {
      router.push('/signin');
    }
  }, [authEnabled, loading, user, router]);

  if (authEnabled && (loading || !user)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Skeleton className="h-16 w-full" />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-4">
                <Skeleton className="h-12 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col min-w-[450px]">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
