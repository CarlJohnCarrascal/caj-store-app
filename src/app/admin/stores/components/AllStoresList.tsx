'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, PlusCircle, LogIn, Users, CheckCircle, RefreshCw, XCircle, Copy } from 'lucide-react';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createStoreAction, joinStoreAction, approveMemberAction, regenerateJoinCodeAction, removeStoreMemberAction } from '@/lib/actions';
import { getStoreMembers, createStore, joinStore, approveMember, regenerateJoinCode, removeStoreMember, snapshotToArray } from '@/lib/data';
import { Store as StoreType, StoreMemberInfo } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/firebase';
import { onValue, ref } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';

export default function AllStoresList() {
  const { user, appUser } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [stores, setStores] = useState<StoreType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [members, setMembers] = useState<StoreMemberInfo[]>([]);
  const [managingStore, setManagingStore] = useState<StoreType | null>(null);

  useEffect(() => {
    const storesRef = ref(db, 'stores');
    const unsubscribe = onValue(storesRef, (snapshot) => {
      const allStores = snapshotToArray<StoreType>(snapshot);
      setStores(allStores.reverse());
      setIsLoading(false);
    }, (error) => {
      console.error("Failed to fetch all stores:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch store data.' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const groupedMembers = useMemo(() => {
    if (!members) return {};
    return members.reduce((acc, member) => {
      const { status } = member;
      if (!acc[status]) acc[status] = [];
      acc[status].push(member);
      return acc;
    }, {} as Record<StoreMemberInfo['status'], StoreMemberInfo[]>);
  }, [members]);

  const handleOpenMembers = async (store: StoreType) => {
    setManagingStore(store);
    setIsLoading(true);
    const storeMembers = await getStoreMembers(store.id);
    setMembers(storeMembers);
    setIsLoading(false);
    setIsMembersOpen(true);
  }

  const handleApproveMember = (memberId: string) => {
    if (!managingStore?.id || !user || !appUser) return;
    startTransition(async () => {
      try {
        await approveMember(managingStore.id, memberId, { userId: user.uid, userName: appUser.name });
        await approveMemberAction();
        toast({ title: 'Member Approved!' });
        const updatedMembers = await getStoreMembers(managingStore.id);
        setMembers(updatedMembers);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
  }

  const handleRemoveMember = (memberId: string) => {
    if (!managingStore?.id || !user || !appUser) return;
    startTransition(async () => {
      try {
        await removeStoreMember(managingStore.id, memberId, { userId: user.uid, userName: appUser.name });
        await removeStoreMemberAction();
        toast({ title: 'Action Successful' });
        const updatedMembers = await getStoreMembers(managingStore.id);
        setMembers(updatedMembers);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
  };

  const handleRegenerateCode = (storeId: string) => {
    if (!user || !appUser) return;
    startTransition(async () => {
      try {
        await regenerateJoinCode(storeId, { userId: user.uid, userName: appUser.name });
        await regenerateJoinCodeAction();
        toast({ title: "Join Code Refreshed!" });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: "Copied!", description: "Join code copied to clipboard." });
    }).catch(() => {
      toast({ variant: 'destructive', title: 'Failed to copy' });
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Stores ({stores.length})</CardTitle>
          <CardDescription>A list of all stores created on the platform. As an admin, you can manage members for any store.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stores.map(store => (
              <div key={store.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                <div>
                  <div className="flex items-center gap-4">
                    <Store className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{store.name}</p>
                      <p className="text-sm text-muted-foreground">Owner: {store.ownerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-sm font-medium">Join Code:</Label>
                    <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                      <span className="font-mono text-sm">{store.joinCode}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopyCode(store.joinCode)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRegenerateCode(store.id)} disabled={isPending}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={() => handleOpenMembers(store)}><Users className="mr-2 h-4 w-4" />Manage Members</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {managingStore && (
        <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Members for {managingStore.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="pr-6 space-y-6">
                {groupedMembers.pending?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold">Pending Requests</h3>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      {groupedMembers.pending.map(member => (
                        <div key={member.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleApproveMember(member.id)} disabled={isPending}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" disabled={isPending}><XCircle className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject Member?</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to reject this request?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveMember(member.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">Reject</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {groupedMembers.approved?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold">Approved Members</h3>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      {groupedMembers.approved.map(member => (
                        <div key={member.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                          <div>
                            <p className="font-medium">{member.name} {member.id === user?.id && '(You)'}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={member.role === 'owner' ? 'default' : 'outline'}>{member.role}</Badge>
                            {member.id !== managingStore.ownerId && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" disabled={isPending}><XCircle className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure you want to remove {member.name} from this store?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveMember(member.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(!groupedMembers.pending || groupedMembers.pending.length === 0) && (!groupedMembers.approved || groupedMembers.approved.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No members found for this store.</p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
