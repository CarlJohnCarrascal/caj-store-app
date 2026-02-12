'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

// SVG for Google icon
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.8S111.8 17.6 244 17.6c70.9 0 121.5 27.7 166.4 69.6l-67.5 64.8C294.6 118.6 272.5 102 244 102c-58.4 0-106.3 47.9-106.3 106.3s47.9 106.3 106.3 106.3c66.2 0 91.6-49.2 96.2-72.2H244v-83.8h236.1c2.3 12.7 3.9 26.9 3.9 42.5z"></path>
  </svg>
);

export default function SignInPage() {
  const { signInWithGoogle, signInWithEmail, user, appUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);


  useEffect(() => {
    // This effect handles the result of a redirect-based sign-in (like Google)
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          const userRef = ref(db, `users/${user.uid}`);
          const userSnap = await get(userRef);

          if (userSnap.exists()) {
            const dbUser = userSnap.val();
            if (dbUser.authorized) {
              router.push('/admin');
            } else {
              router.push('/unauthorized');
            }
          } else {
            router.push('/auth/complete-profile');
          }
        } else {
          // No redirect result, proceed with normal auth state checking
          setIsProcessingRedirect(false);
        }
      } catch (err: any) {
        console.error("Auth redirect error:", err);
        toast({
          variant: 'destructive',
          title: 'Sign In Error',
          description: err.code === 'auth/account-exists-with-different-credential'
            ? 'An account already exists with the same email address but different sign-in credentials. Try signing in with the original method.'
            : err.message,
        });
        setIsProcessingRedirect(false);
      }
    };
    handleRedirect();
  }, [router, toast]);


  useEffect(() => {
    // This effect handles what to do once we know the user's auth state
    // (and we're not busy processing a redirect).
    if (!isProcessingRedirect && !loading) {
      if (user) {
        if (appUser) {
          router.replace(appUser.authorized ? '/admin' : '/unauthorized');
        } else {
          router.replace('/auth/complete-profile');
        }
      }
    }
  }, [user, appUser, loading, isProcessingRedirect, router]);

  const handleEmailSignIn = async () => {
    if (!email || !password) {
        toast({ variant: 'destructive', title: 'Missing fields', description: 'Please enter both email and password.' });
        return;
    }
    try {
      await signInWithEmail(email, password);
      // The user will be redirected by the useEffect if successful
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign-in Failed', description: error.message || 'An unknown error occurred with Email/Password Sign-In.' });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // This will redirect the user. The result is handled by the useEffect.
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign-in Failed', description: error.message || 'An unknown error occurred with Google Sign-In.' });
    }
  };
  
  if (loading || isProcessingRedirect || user) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Checking authentication status...</p>
        </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Caj-Store</h1>
          <p className="text-muted-foreground">Admin Portal</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Sign in to your account to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                        id="password" 
                        type="password" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <Button onClick={handleEmailSignIn} className="w-full">
                    Sign In with Email
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                        </span>
                    </div>
                </div>
                <Button onClick={handleGoogleSignIn} variant="outline" className="w-full">
                    <GoogleIcon />
                    Sign In with Google
                </Button>
            </div>
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
