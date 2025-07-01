'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const { signInWithLink, signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState<'link' | 'pin' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || pin.length < 6) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid email and 6-digit PIN.' });
      return;
    }
    setLoading('pin');
    try {
      await signInWithPassword(email, pin);
      // Successful sign in will be handled by the AuthProvider
    } catch (error: any) {
      let description = 'An unknown error occurred.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-password') {
        description = 'The email or PIN you entered is incorrect.';
      } else {
        description = error.message;
      }
      toast({ variant: 'destructive', title: 'Sign-in Failed', description });
    } finally {
      setLoading(null);
    }
  };
  
  const handleLinkSubmit = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Email is required' });
      return;
    }
    setLoading('link');
    try {
      await signInWithLink(email);
      setSubmitted(true);
    } catch (error: any)
      {
      toast({ variant: 'destructive', title: 'Sign-in Error', description: error.message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Caj-Store</h1>
          <p className="text-muted-foreground">{origin || 'Admin Portal'}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{submitted ? 'Check Your Email' : 'Sign In'}</CardTitle>
            <CardDescription>
              {submitted
                ? "We've sent a sign-in link to your email address. Click the link to complete sign-in."
                : 'Enter your email and PIN, or choose to sign in with a link.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
             {submitted ? (
              <div className="p-6 pt-0 text-center text-muted-foreground">
                <p>If you don't see the email, please check your spam folder.</p>
              </div>
            ) : (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN</Label>
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
                 <div className="space-y-2">
                  <Button type="submit" disabled={!!loading} className="w-full">
                    {loading === 'pin' ? 'Signing In...' : 'Sign In with PIN'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleLinkSubmit} disabled={!!loading} className="w-full">
                    {loading === 'link' ? 'Sending...' : 'Send Sign-in Link'}
                  </Button>
                </div>
              </form>
            )}
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
