'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthActionHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing sign-in...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          const user = result.user;
          // User is authenticated with Firebase. Now check if they have a profile in our DB.
          setStatus('Verifying user profile...');
          const userRef = ref(db, `users/${user.uid}`);
          const userSnap = await get(userRef);

          if (userSnap.exists()) {
            // User exists in our DB, redirect based on authorization
            const appUser = userSnap.val();
            setStatus('Redirecting...');
            if (appUser.authorized) {
              router.push('/admin');
            } else {
              router.push('/unauthorized');
            }
          } else {
            // New user, redirect to complete profile
            setStatus('New user detected. Redirecting to profile setup...');
            router.push('/auth/complete-profile');
          }
        } else {
          // This page was loaded without a redirect result. Maybe a refresh?
          // Let's check the current auth state.
          if (auth.currentUser) {
            // User is already logged in, just go to admin.
            router.push('/admin');
          } else {
            // No user, no redirect. Send to sign in page.
            router.push('/signin');
          }
        }
      } catch (err: any) {
        console.error("Auth action error:", err);
        setError(`Failed to process sign-in: ${err.message}. Please try again.`);
        setStatus('Error occurred.');
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authenticating</CardTitle>
          <CardDescription>
            Please wait while we securely sign you in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <p>{status}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
