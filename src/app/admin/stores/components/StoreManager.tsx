
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, PlusCircle, LogIn, Users, CheckCircle, Clock } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createStoreAction, joinStoreAction, approveMemberAction } from '@/lib/actions';
import { getStoreMembers } from '@/lib/data';
import { StoreMemberInfo } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StoreManager() {
  const { user, appUser, memberStores, activeStore, activeStoreId, isStoreOwner } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  const [newStoreName, setNewStoreName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [members, setMembers] = useState<StoreMemberInfo[]>([]);

  const handleCreateStore = () => {
    if (!user || !appUser || !newStoreName) return;
    startTransition(async () => {
      try {
        await createStoreAction(newStoreName, { userId: user.uid, userName: appUser.name });
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
        await joinStoreAction(joinCode, { id: user.uid, name: appUser.name, email: appUser.email });
        toast({ title: 'Request Sent!', description: `Your request to join the store has been sent for approval.`});
        setIsJoinOpen(false);
        setJoinCode('');
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    });
  };
  
  const handleOpenMembers = async () => {
    if(!activeStoreId) return;
    const storeMembers = await getStoreMembers(activeStoreId);
    setMembers(storeMembers);
    setIsMembersOpen(true);
  }

  const handleApproveMember = (memberId: string) => {
    if(!activeStoreId || !user || !appUser) return;
    startTransition(async () => {
        try {
            await approveMemberAction(activeStoreId, memberId, { userId: user.uid, userName: appUser.name });
            toast({ title: 'Member Approved!' });
            const updatedMembers = await getStoreMembers(activeStoreId);
            setMembers(updatedMembers);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  }

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
                    {memberStores.map(store => (
                        <div key={store.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-4">
                                <Store className="h-6 w-6 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">{store.name}</p>
                                    <p className="text-sm text-muted-foreground">{store.ownerId === user?.uid ? 'Owner' : 'Member'}</p>
                                </div>
                                {store.id === activeStoreId && <Badge>Active</Badge>}
                            </div>
                             {isStoreOwner && store.id === activeStoreId && (
                                <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" onClick={handleOpenMembers}><Users className="mr-2 h-4 w-4" />Manage Members</Button>
                                    </DialogTrigger>
                                     <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Manage Members for {store.name}</DialogTitle>
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
                                                            <Button size="sm" onClick={() => handleApproveMember(member.id)} disabled={isPending}>
                                                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                                            </Button>
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
                    ))}
                </div>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
