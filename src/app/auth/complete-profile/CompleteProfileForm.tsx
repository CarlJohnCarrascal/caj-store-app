'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { createStoreAccountAction, createUserProfileAction, joinStoreByCodeAction } from '@/lib/actions';
import { updateProfile, updatePassword } from 'firebase/auth';

export default function CompleteProfileForm() {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeMode, setStoreMode] = useState<'create' | 'join'>('create');
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [createdStore, setCreatedStore] = useState<{ name: string; code: string } | null>(null);
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
    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'PIN too short', description: 'PIN must be at least 6 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'PINs do not match' });
      return;
    }
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'No authenticated user found.' });
        return;
    }
    if (storeMode === 'create' && !storeName.trim()) {
      toast({ variant: 'destructive', title: 'Store name is required' });
      return;
    }
    if (storeMode === 'join' && !storeCode.trim()) {
      toast({ variant: 'destructive', title: 'Store code is required' });
      return;
    }

    startTransition(async () => {
      try {
        let selectedStore: { id: string; name: string; code?: string } | null = null;
        if (storeMode === 'create') {
          const newStore = await createStoreAccountAction({
            storeName: storeName.trim(),
            userId: user.uid,
            userName: name.trim(),
          });
          selectedStore = newStore;
        } else {
          const existingStore = await joinStoreByCodeAction({ code: storeCode.trim() });
          selectedStore = existingStore;
        }
        // Update Firebase Auth profile
        await updateProfile(user, { displayName: name });
        // Set the user's password
        await updatePassword(user, password);
        // Create our own app user profile in the database
        await createUserProfileAction({
            id: user.uid,
            name: name,
            email: user.email!,
            storeId: selectedStore?.id,
            storeName: selectedStore?.name,
        });
        if (storeMode === 'create' && selectedStore?.code) {
          setCreatedStore({ name: selectedStore.name, code: selectedStore.code });
          toast({ title: 'Store Created!', description: 'Share the store code to invite others.' });
          return;
        }
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
          Please enter your full name, a 6-digit PIN, and choose how to access a store.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {createdStore ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Your store is ready!</p>
              <p className="mt-2 text-lg font-semibold">{createdStore.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">Share this store code:</p>
              <p className="mt-2 font-mono text-2xl tracking-widest">{createdStore.code}</p>
            </div>
            <Button type="button" onClick={() => router.push('/unauthorized')} className="w-full">
              Continue
            </Button>
          </div>
        ) : (
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
            <div className="space-y-2">
              <Label htmlFor="password">6-Digit PIN</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm PIN</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={6}
              />
            </div>
            <Tabs value={storeMode} onValueChange={(value) => setStoreMode(value as 'create' | 'join')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Store</TabsTrigger>
                <TabsTrigger value="join">Join Store</TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  type="text"
                  placeholder="e.g. Main Street Caj-Store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  We'll generate a store code that you can share with others.
                </p>
              </TabsContent>
              <TabsContent value="join" className="space-y-2">
                <Label htmlFor="storeCode">Store Code</Label>
                <Input
                  id="storeCode"
                  type="text"
                  placeholder="Enter the store code"
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the code provided by the store creator.
                </p>
              </TabsContent>
            </Tabs>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Complete Profile'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
