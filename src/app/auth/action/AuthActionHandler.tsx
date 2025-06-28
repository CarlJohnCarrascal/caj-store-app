'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthActionHandler() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSignIn = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setError('This is not a valid sign-in link.');
        setLoading(false);
        return;
      }

      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
        if (!email) {
            setError('Email is required to complete sign-in.');
            setLoading(false);
            return;
        }
      }

      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        
        // Check if the user is new (has no display name)
        if (!result.user.displayName) {
            router.push('/auth/complete-profile');
        } else {
            router.push('/admin');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to sign in. The link may have expired or been used already.');
        setLoading(false);
      }
    };

    handleSignIn();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Completing Sign In</CardTitle>
          <CardDescription>
            {loading && 'Please wait while we securely sign you in...'}
            {error && 'An error occurred.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p>Verifying your link...</p>}
          {error && <p className="text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
