
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// SVG for Google icon
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.8S111.8 17.6 244 17.6c70.9 0 121.5 27.7 166.4 69.6l-67.5 64.8C294.6 118.6 272.5 102 244 102c-58.4 0-106.3 47.9-106.3 106.3s47.9 106.3 106.3 106.3c66.2 0 91.6-49.2 96.2-72.2H244v-83.8h236.1c2.3 12.7 3.9 26.9 3.9 42.5z"></path>
  </svg>
);

export default function SignInPage() {
  const { signInWithGoogle, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);
  
  useEffect(() => {
    if (!authLoading && appUser) {
        if (appUser.authorized) {
            router.push('/admin');
        } else {
            router.push('/unauthorized');
        }
    }
  }, [appUser, authLoading, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Let the useEffect handle the redirect
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign-in Failed', description: error.message || 'An unknown error occurred with Google Sign-In.' });
    } finally {
      setLoading(false);
    }
  };
  
  if (authLoading || appUser) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Loading...</p>
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
            <Button onClick={handleGoogleSignIn} disabled={loading} className="w-full">
              <GoogleIcon />
              {loading ? 'Signing In...' : 'Sign In with Google'}
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
