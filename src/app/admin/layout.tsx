
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function FirebaseConfigWarning() {
  if (isFirebaseConfigured) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Firebase Not Configured</AlertTitle>
        <AlertDescription>
          Your Firebase environment variables are missing. Please create a <code>.env.local</code> file in your project root and add your Firebase project credentials to it. You can use the <code>.env</code> file as a template. The app will not function correctly until this is done.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isFirebaseConfigured && authEnabled && !loading && !user) {
      router.push('/signin');
    }
  }, [authEnabled, loading, user, router]);

  if (isFirebaseConfigured && authEnabled && (loading || !user)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
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
      <FirebaseConfigWarning />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
