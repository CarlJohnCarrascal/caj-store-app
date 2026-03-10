
'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { AppUser } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateUserAuthorizationAction, updateUserRoleAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { getStoreData, setStoreData } from '@/lib/offline';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const loadFromCache = async () => {
        const cachedData = await getStoreData<AppUser>('users');
        if (cachedData.length > 0) {
            setUsers(cachedData);
            setIsLoading(false);
        }
    };
    loadFromCache();

    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const userList = snapshotToArray<AppUser>(snapshot);
      setUsers(userList);
      setIsLoading(false);
      setStoreData('users', userList);
    }, (error) => {
        console.error("Firebase listener failed:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => {
        if (statusFilter === 'all') return true;
        return statusFilter === 'authorized' ? user.authorized : !user.authorized;
      })
      .filter(user => {
        if (roleFilter === 'all') return true;
        return user.role === roleFilter;
      })
      .filter(user => {
        if (!searchTerm) return true;
        const lowercasedTerm = searchTerm.toLowerCase();
        return (
          user.name.toLowerCase().includes(lowercasedTerm) ||
          user.email.toLowerCase().includes(lowercasedTerm)
        );
      });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleAuthorizationChange = (userId: string, authorized: boolean) => {
    if (!appUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify the current user.' });
        return;
    }

    startTransition(async () => {
        try {
            await updateUserAuthorizationAction(userId, authorized, { userId: appUser.id, userName: appUser.name });
            toast({ title: 'Success', description: 'User authorization updated successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update authorization.' });
        }
    });
  };
  
  const handleRoleChange = (userId: string, role: 'admin' | 'user') => {
    if (!appUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify the current user.' });
        return;
    }

    startTransition(async () => {
        try {
            await updateUserRoleAction(userId, role, { userId: appUser.id, userName: appUser.name });
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
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
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
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
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
       <div className="flex flex-col md:flex-row items-center gap-4 p-4 border-b">
          <div className="relative w-full md:w-auto md:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="authorized">Authorized</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
              </SelectContent>
          </Select>
      </div>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
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
                    <Badge variant={user.authorized ? 'default' : 'secondary'}>{user.authorized ? 'Authorized' : 'Pending'}</Badge>
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className={cn(user.role === 'admin' && 'border-primary text-primary')}>{user.role}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    {user.id === appUser?.id ? (
                        <Badge variant="outline">This is you</Badge>
                    ) : (
                        <div className="flex gap-2 justify-end">
                            {user.authorized ? (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleAuthorizationChange(user.id, false)}
                                    disabled={isPending}
                                >
                                    Revoke Access
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => handleAuthorizationChange(user.id, true)}
                                    disabled={isPending}
                                >
                                    Authorize
                                </Button>
                            )}
                             {user.role === 'admin' ? (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleRoleChange(user.id, 'user')}
                                    disabled={isPending}
                                >
                                    Make User
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleRoleChange(user.id, 'admin')}
                                    disabled={isPending}
                                >
                                    Make Admin
                                </Button>
                            )}
                        </div>
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
