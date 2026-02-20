'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
  const { user, appUser, loading, isAuthorized, isAdmin, activeStoreId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && authEnabled) {
      if (!user) {
        router.push('/signin');
      } else if (!appUser) {
        router.push('/auth/complete-profile');
      } else if (!isAuthorized) {
        router.push('/unauthorized');
      } else if (isAdmin) {
        // If user is admin and they land on the root dashboard, redirect to superadmin.
        // Admins are not required to have an active store.
        if (pathname === '/admin') {
            router.replace('/admin/superadmin');
        }
      } else if (!activeStoreId && pathname !== '/admin/stores') {
        // For non-admins, redirect to stores page if no active store.
        router.push('/admin/stores');
      }
    }
  }, [authEnabled, loading, user, appUser, isAuthorized, activeStoreId, router, pathname, isAdmin]);

  const firebaseConfigMissing = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  // For Admins, show content if they are authorized.
  // For non-admins, they must have an active store or be on the stores page.
  const showContent = !authEnabled || (!loading && user && isAuthorized && (isAdmin || activeStoreId || pathname === '/admin/stores'));
  
  const isPosMode = pathname === '/admin/pos-mode';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={cn(
        "flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8",
        isPosMode && "max-w-full px-4"
        )}>
        {firebaseConfigMissing && (
           <Alert variant="destructive" className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Firebase Configuration Missing!</AlertTitle>
            <AlertDescription>
              Your Firebase environment variables are not set. Please create a <code>.env.local</code> file from the <code>.env.example</code> template and fill in your project credentials. The application may not function correctly.
            </AlertDescription>
          </Alert>
        )}
        {showContent ? (
          children
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
      </main>
    </div>
  );
}
