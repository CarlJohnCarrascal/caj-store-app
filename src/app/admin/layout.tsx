'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
  const { user, appUser, loading, isAuthorized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authEnabled) {
      if (!user) {
        router.push('/signin');
      } else if (!appUser) {
        // Logged in with Firebase Auth, but no profile in DB yet
        router.push('/auth/complete-profile');
      } else if (!isAuthorized) {
        router.push('/unauthorized');
      }
    }
  }, [authEnabled, loading, user, appUser, isAuthorized, router]);

  const firebaseConfigMissing = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  const showContent = !authEnabled || (!loading && user && isAuthorized);

  return (
    <div className="min-h-screen flex flex-col min-w-[450px]">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
