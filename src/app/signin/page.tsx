'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ variant: 'destructive', title: 'Email is required' });
      return;
    }
    setLoading(true);
    try {
      await signIn(email);
      setSubmitted(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign-in Error', description: error.message });
    } finally {
      setLoading(false);
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
                : "Enter your email below to receive a secure sign-in link."
              }
            </CardDescription>
          </CardHeader>
          {!submitted && (
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      required
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Sending...' : 'Send Sign-in Link'}
                </Button>
              </form>
            </CardContent>
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
