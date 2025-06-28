'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createUserProfileAction } from '@/lib/actions';
import { updateProfile } from 'firebase/auth';

export default function CompleteProfileForm() {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in at all, go to sign in page
        router.replace('/signin');
      } else if (appUser) {
        // User profile already exists, redirect to their destination
        router.replace(appUser.authorized ? '/admin' : '/unauthorized');
      }
    }
  }, [user, appUser, loading, router]);


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
        // Update Firebase Auth profile
        await updateProfile(user, { displayName: name });
        // Create our own app user profile in the database
        await createUserProfileAction({
            id: user.uid,
            name: name,
            email: user.email!,
        });
        toast({ title: 'Profile Created!', description: "Welcome! Your account is pending admin approval." });
        router.push('/unauthorized'); 
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Setup Failed', description: error.message });
      }
    });
  };

  if (loading || !user || appUser) {
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
            {isPending ? 'Saving...' : 'Complete Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
