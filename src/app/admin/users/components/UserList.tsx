
'use client';

import { useState, useEffect, useTransition } from 'react';
import { AppUser } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateUserRoleAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

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

export default function UserList() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const userList = snapshotToArray<AppUser>(snapshot);
      setUsers(userList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = (userId: string, newRole: 'admin' | 'user') => {
    if (!appUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify the current user.' });
        return;
    }

    startTransition(async () => {
        try {
            await updateUserRoleAction(userId, newRole, { userId: appUser.id, userName: appUser.name });
            toast({ title: 'Success', description: 'User role updated successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update role.' });
        }
    });
  };

  if (isLoading) {
    return (
       <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-48" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-64" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-24" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                           <TableRow key={i}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-5 w-32" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                           </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
       </Card>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <h3 className="text-xl font-semibold">No Users Found</h3>
        <p className="text-muted-foreground mt-2">Registered users will appear here.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarFallback>{user.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                    </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    {user.id === appUser?.id ? (
                        <Badge variant="outline">This is you</Badge>
                    ) : user.role === 'admin' ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, 'user')}
                            disabled={isPending}
                        >
                            Revoke Admin
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            disabled={isPending}
                        >
                            Authorize
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
