
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, PlusCircle, LogIn, Users, CheckCircle, Clock, RefreshCw, XCircle, Copy } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createStoreAction, joinStoreAction, approveMemberAction, regenerateJoinCodeAction, removeStoreMemberAction } from '@/lib/actions';
import { getStoreMembers, createStore, joinStore, approveMember, regenerateJoinCode, removeStoreMember } from '@/lib/data';
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


export default function StoreManager() {
  const { user, appUser, memberStores, activeStore, activeStoreId } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  const [newStoreName, setNewStoreName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [members, setMembers] = useState<StoreMemberInfo[]>([]);
  const [managingStore, setManagingStore] = useState<StoreType | null>(null);

  const handleCreateStore = () => {
    if (!user || !appUser || !newStoreName) return;
    startTransition(async () => {
      try {
        await createStore(newStoreName, { id: user.uid, name: appUser.name, email: appUser.email! });
        await createStoreAction();
        toast({ title: 'Store Created!', description: `"${newStoreName}" has been created and set as your active store.`});
        setIsCreateOpen(false);
        setNewStoreName('');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
  };

  const handleJoinStore = () => {
    if (!user || !appUser || !joinCode) return;
    startTransition(async () => {
      try {
        await joinStore(joinCode, { id: user.uid, name: appUser.name, email: appUser.email! });
        await joinStoreAction();
        toast({ title: 'Request Sent!', description: `Your request to join the store has been sent for approval.`});
        setIsJoinOpen(false);
        setJoinCode('');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
  };
  
  const handleOpenMembers = async (store: StoreType) => {
    setManagingStore(store);
    const storeMembers = await getStoreMembers(store.id);
    setMembers(storeMembers);
    setIsMembersOpen(true);
  }

  const handleApproveMember = (memberId: string) => {
    if(!managingStore?.id || !user || !appUser) return;
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
    }).catch(err => {
        toast({ variant: 'destructive', title: 'Failed to copy', description: 'Could not copy code to clipboard.' });
    });
  };


  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Store</CardTitle>
          <CardDescription>Start a new business profile. You will be the owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Creating a store gives you a unique space to manage your products, orders, and customers.
          </p>
        </CardContent>
        <CardFooter>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" />Create Store</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Name Your New Store</DialogTitle>
                        <DialogDescription>Give your new business a name. You can change this later.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="store-name">Store Name</Label>
                        <Input id="store-name" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} />
                    </div>
                    <Button onClick={handleCreateStore} disabled={isPending}>
                        {isPending ? 'Creating...' : 'Create Store'}
                    </Button>
                </DialogContent>
            </Dialog>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Join an Existing Store</CardTitle>
          <CardDescription>Enter an invite code to request access to another store.</CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-sm text-muted-foreground">
            The store owner will need to approve your request before you can access it.
          </p>
        </CardContent>
        <CardFooter>
             <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
                <DialogTrigger asChild>
                    <Button variant="secondary"><LogIn className="mr-2 h-4 w-4" />Join Store</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enter Join Code</DialogTitle>
                        <DialogDescription>Ask the store owner for their 6-character join code.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="join-code">Join Code</Label>
                        <Input id="join-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
                    </div>
                    <Button onClick={handleJoinStore} disabled={isPending}>
                        {isPending ? 'Sending Request...' : 'Request to Join'}
                    </Button>
                </DialogContent>
            </Dialog>
        </CardFooter>
      </Card>

      {memberStores.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Your Stores</CardTitle>
                <CardDescription>List of stores you are a member of.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {memberStores.map(store => {
                        const isOwner = store.ownerId === user?.uid;
                        return (
                        <div key={store.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                            <div>
                                <div className="flex items-center gap-4">
                                    <Store className="h-6 w-6 text-muted-foreground" />
                                    <div>
                                        <p className="font-semibold">{store.name}</p>
                                        <p className="text-sm text-muted-foreground">{isOwner ? 'Owner' : 'Member'}</p>
                                    </div>
                                    {store.id === activeStoreId && <Badge>Active</Badge>}
                                </div>
                                {isOwner && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Label htmlFor={`join-code-${store.id}`} className="text-sm font-medium">Join Code:</Label>
                                        <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                                            <span id={`join-code-${store.id}`} className="font-mono text-sm">{store.joinCode}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopyCode(store.joinCode)}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRegenerateCode(store.id)} disabled={isPending}>
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                             {isOwner && (
                                <Button variant="outline" onClick={() => handleOpenMembers(store)}><Users className="mr-2 h-4 w-4" />Manage Members</Button>
                             )}
                        </div>
                    )})}
                </div>
            </CardContent>
          </Card>
      )}

      {managingStore && (
        <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Members for {managingStore.name}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="pr-6 space-y-2">
                    {members.map(member => (
                        <div key={member.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                            <div>
                                <p className="font-medium">{member.name} {member.id === user?.id && '(You)'}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={member.status === 'approved' ? 'default' : 'secondary'}>{member.status}</Badge>
                                {member.status === 'pending' && (
                                    <>
                                        <Button size="sm" onClick={() => handleApproveMember(member.id)} disabled={isPending}>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="sm" variant="destructive" disabled={isPending}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
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
                                    </>
                                )}
                                {member.status === 'approved' && member.id !== managingStore.ownerId && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive" disabled={isPending}><XCircle className="mr-2 h-4 w-4" /> Remove</Button>
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
                </ScrollArea>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
