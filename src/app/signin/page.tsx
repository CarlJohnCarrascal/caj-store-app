
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// SVG for Google icon
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.8S111.8 17.6 244 17.6c70.9 0 121.5 27.7 166.4 69.6l-67.5 64.8C294.6 118.6 272.5 102 244 102c-58.4 0-106.3 47.9-106.3 106.3s47.9 106.3 106.3 106.3c66.2 0 91.6-49.2 96.2-72.2H244v-83.8h236.1c2.3 12.7 3.9 26.9 3.9 42.5z"></path>
  </svg>
);

export default function SignInPage() {
  const { signInWithGoogle, user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    
    // This effect runs once on page load to handle the redirect from Google.
    getRedirectResult(auth)
      .catch((error) => {
        console.error("Sign-in redirect error:", error);
        // This error can happen if the popup is closed or if the domain is not authorized in Firebase.
        toast({
          variant: 'destructive',
          title: 'Sign-in Failed',
          description: `Could not process sign-in. (${error.code})`,
        });
      })
      .finally(() => {
        // Once the redirect is processed (or if there wasn't one),
        // we can let the rest of the app's logic take over.
        setIsProcessingRedirect(false);
      });
  }, [toast]);
  
  useEffect(() => {
    // This effect handles navigation once we know the final auth state.
    // It waits for both the main auth loading and the redirect processing to finish.
    if (!authLoading && !isProcessingRedirect) {
        if (appUser) { // User has a profile in our DB
            if (appUser.authorized) {
                router.push('/admin');
            } else {
                router.push('/unauthorized');
            }
        } else if (user && !appUser) { // User is authenticated with Firebase but has no profile yet
            router.push('/auth/complete-profile');
        }
        // If no user, do nothing and stay on the sign-in page.
    }
  }, [user, appUser, authLoading, isProcessingRedirect, router]);

  const handleGoogleSignIn = async () => {
    // We don't need a loading state here because it will redirect away.
    try {
      await signInWithGoogle();
      // The user will be redirected to Google and then back to this page.
      // The useEffect hooks above will handle the result.
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign-in Failed', description: error.message || 'An unknown error occurred with Google Sign-In.' });
    }
  };
  
  // Show a loading screen while auth state is being determined or redirect is processing.
  if (authLoading || isProcessingRedirect) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Verifying authentication...</p>
        </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Caj-Store</h1>
          <p className="text-muted-foreground">{origin || 'Admin Portal'}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Sign in to your account using Google to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoogleSignIn} className="w-full">
              <GoogleIcon />
              Sign In with Google
            </Button>
          </CardContent>
        </Card>
        <div className="text-center text-sm">
          <Link href="/" className="text-muted-foreground hover:text-primary">
            Back to Welcome Page
          </Link>
        </div>
      </div>
    </div>
  );
}
