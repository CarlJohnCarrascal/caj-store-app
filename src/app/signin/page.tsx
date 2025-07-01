'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, KeyRound, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SignInPage() {
  const { signIn, signInWithPin } = useAuth();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const loading = emailLoading || pinLoading;

  const isPinAuthConfigured =
    process.env.NEXT_PUBLIC_PIN_AUTH_EMAIL &&
    process.env.NEXT_PUBLIC_PIN_AUTH_PASSWORD_PREFIX !== undefined &&
    process.env.NEXT_PUBLIC_PIN_AUTH_PASSWORD_SUFFIX !== undefined;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ variant: 'destructive', title: 'Email is required' });
      return;
    }
    setEmailLoading(true);
    setPin(''); // Clear pin field when submitting email
    try {
      await signIn(email);
      setSubmitted(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign-in Error', description: error.message });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'PIN must be 6 digits.' });
      return;
    }
    setPinLoading(true);
    setEmail(''); // Clear email field when submitting PIN
    try {
      await signInWithPin(pin);
      // Successful sign in will be handled by the AuthProvider's onAuthStateChanged which redirects
    } catch (error: any) {
      let description = 'An unknown error occurred.';
      // Map Firebase auth errors to user-friendly messages
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        description = 'The PIN you entered is incorrect. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
        description = 'PIN user account is not set up in Firebase Authentication.';
      } else {
        description = error.message;
      }
      toast({ variant: 'destructive', title: 'Sign-in Failed', description });
    } finally {
      setPinLoading(false);
      setPin(''); // Clear pin on failure
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Caj-Store</h1>
          <p className="text-muted-foreground">Admin Portal</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{submitted ? 'Check Your Email' : 'Sign In'}</CardTitle>
            <CardDescription>
              {submitted
                ? "We've sent a sign-in link to your email address. Click the link to complete sign-in."
                : 'Enter your email for a sign-in link or use your PIN code below.'}
            </CardDescription>
          </CardHeader>
          {!submitted ? (
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Sign-in</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button type="submit" disabled={loading}>
                      {emailLoading ? 'Sending...' : 'Send Link'}
                    </Button>
                  </div>
                </div>
              </form>

              <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-muted" />
                <span className="mx-4 flex-shrink text-xs text-muted-foreground">OR</span>
                <div className="flex-grow border-t border-muted" />
              </div>

              {isPinAuthConfigured ? (
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin">Sign In with PIN</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="pin"
                        type="password"
                        placeholder="• • • • • •"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        pattern="\d{6}"
                        autoComplete="one-time-code"
                        className="pl-9 text-center text-lg tracking-[0.5em]"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {pinLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              ) : (
                <Alert variant="destructive">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>PIN Login Not Configured</AlertTitle>
                  <AlertDescription>
                    PIN authentication has not been set up correctly. Please contact an administrator.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          ) : (
            <div className="p-6 pt-0 text-center text-muted-foreground">
              <p>If you don't see the email, please check your spam folder.</p>
            </div>
          )}
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
