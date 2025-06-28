'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createUserProfile } from '@/lib/data';
import { User, updateProfile } from 'firebase/auth';

export default function CompleteProfileForm() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // If user is loaded and already has a display name, they shouldn't be here.
    if (!loading && user && user.displayName) {
      router.replace('/admin');
    }
    // If user is loaded and is null, they should sign in.
    if (!loading && !user) {
        router.replace('/signin');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Name is required' });
      return;
    }
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'No authenticated user found.' });
        return;
    }

    startTransition(async () => {
      try {
        await updateProfile(user, { displayName: name });
        await createUserProfile({
            id: user.uid,
            name: name,
            email: user.email!,
        });
        toast({ title: 'Profile Created!', description: 'Welcome! You will now be redirected.' });
        router.push('/admin');
        // Manually trigger a reload of the user state in the auth hook
        // This is a workaround to ensure displayName is picked up everywhere.
        router.refresh(); 
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Setup Failed', description: error.message });
      }
    });
  };

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome! Let's set up your profile.</CardTitle>
        <CardDescription>
          Please enter your full name. This will be used to track your activity within the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Saving...' : 'Continue to Dashboard'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
