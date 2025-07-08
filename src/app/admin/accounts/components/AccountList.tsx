'use client';

import { useState, useEffect, useTransition } from 'react';
import { Account } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteAccountAction } from '@/lib/actions';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getStoreData, setStoreData, deleteItem } from '@/lib/offline';

function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
  const items: (T & { id: string })[] = [];
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot: any) => {
      items.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });
  }
  return items;
}

export default function AccountList() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    const loadFromCache = async () => {
      const cachedData = await getStoreData<Account>('accounts');
      if (cachedData.length > 0) {
        setAccounts(cachedData);
        setIsLoading(false);
      }
    };
    loadFromCache();

    const accountsRef = ref(db, 'accounts');
    const unsubscribe = onValue(accountsRef, (snapshot) => {
      const accountList = snapshotToArray<Account>(snapshot);
      setAccounts(accountList);
      setIsLoading(false);
      setStoreData('accounts', accountList);
    }, (error) => {
      console.error("Firebase listener failed:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = (id: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to delete accounts.' });
        return;
    }
    startTransition(async () => {
      try {
        await deleteAccountAction(id, { userId: user.uid, userName: user.displayName || user.email! });
        await deleteItem('accounts', id);
        toast({ title: 'Success', description: 'Account deleted successfully.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete account.' });
      }
    });
  };

  if (isLoading) {
     return (
       <Card>
         <CardHeader>
           <CardTitle>Your Accounts</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
          {[...Array(2)].map((_, i) => (
             <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24" />
             </div>
          ))}
         </CardContent>
       </Card>
     )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accounts.length > 0 ? (
            accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    <div className="bg-muted p-3 rounded-full">
                        <Landmark className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-semibold text-lg">{account.accountName}</p>
                        <p className="text-sm text-muted-foreground">{account.bankName} &middot; {account.accountNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     {/* <p className={cn(
                      "font-semibold text-xl",
                       account.balance >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      ₱{account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p> */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the account and may affect historical transaction records.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(account.id)}
                            disabled={isPending}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {isPending ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No accounts found. Start by adding one.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
