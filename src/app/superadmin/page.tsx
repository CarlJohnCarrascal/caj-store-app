import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { snapshotToArray } from '@/lib/data';
import type { AppUser, Store as StoreType } from '@/lib/types';

async function getStats() {
    try {
        const usersRef = ref(db, 'users');
        const storesRef = ref(db, 'stores');

        const [usersSnapshot, storesSnapshot] = await Promise.all([
            get(usersRef),
            get(storesRef),
        ]);

        const users = snapshotToArray<AppUser>(usersSnapshot);
        const stores = snapshotToArray<StoreType>(storesSnapshot);

        return {
            userCount: users.length,
            storeCount: stores.length,
        };
    } catch (error) {
        console.error("Failed to fetch stats:", error);
        return {
            userCount: 0,
            storeCount: 0,
        };
    }
}


export default async function SuperAdminDashboard() {
  const { userCount, storeCount } = await getStats();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">System-wide overview and management tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{userCount}</div>
                <p className="text-xs text-muted-foreground">
                All registered users in the system.
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{storeCount}</div>
                <p className="text-xs text-muted-foreground">
                All created stores on the platform.
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Web Visits</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground">
                Analytics integration required.
                </p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-8">
        <Card className="hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center p-6">
            <Users className="h-10 w-10 mb-4 text-primary" />
            <CardTitle className="text-xl font-medium mb-2">Manage Users</CardTitle>
            <CardDescription className="mb-4">
                Authorize new users and manage existing user roles and access.
            </CardDescription>
            <Button asChild className="w-full max-w-xs">
                <Link href="/admin/users">Go to Users</Link>
            </Button>
        </Card>
        <Card className="hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center p-6">
            <Store className="h-10 w-10 mb-4 text-primary" />
            <CardTitle className="text-xl font-medium mb-2">Manage Stores</CardTitle>
            <CardDescription className="mb-4">
                Create, view, and manage all stores across the platform.
            </CardDescription>
            <Button asChild className="w-full max-w-xs">
                <Link href="/admin/stores">Go to Stores</Link>
            </Button>
        </Card>
      </div>
    </div>
  );
}
