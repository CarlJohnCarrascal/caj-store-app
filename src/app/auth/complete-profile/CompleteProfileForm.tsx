
'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createUserProfileAction } from '@/lib/actions';

export default function CompleteProfileForm() {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
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


  const handleSubmit = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'No authenticated user found.' });
        return;
    }
    if (!user.displayName || !user.email) {
        toast({ variant: 'destructive', title: 'Error', description: 'User name or email missing from Google account.' });
        return;
    }

    startTransition(async () => {
      try {
        // Create our app user profile in the database
        await createUserProfileAction({
            id: user.uid,
            name: user.displayName!,
            email: user.email!,
        });
        toast({ title: 'Profile Created!', description: "Welcome! Your account is pending admin approval." });
        // Redirect to unauthorized, which will then redirect to /admin if approved
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
        <CardTitle>Welcome, {user.displayName}!</CardTitle>
        <CardDescription>
          One last step. Click the button below to create your profile in the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Name:</strong> {user.displayName}</p>
            <p><strong>Email:</strong> {user.email}</p>
         </div>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? 'Creating Profile...' : 'Complete Setup'}
          </Button>
      </CardContent>
    </Card>
  );
}
