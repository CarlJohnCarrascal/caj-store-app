'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, BarChart2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { getWebVisits, snapshotToArray } from '@/lib/data';
import type { AppUser, Store as StoreType } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function SuperAdminDashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({ userCount: 0, storeCount: 0 });
  const [loading, setLoading] = useState(true);
  const [analyticsStats, setAnalyticsStats] = useState<{ activeUsers?: string; error?: string } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
        setLoading(false);
        setAnalyticsLoading(false);
        return;
    };

    const usersRef = ref(db, 'users');
    const storesRef = ref(db, 'stores');
    
    const unsubs: (()=>void)[] = [];

    unsubs.push(onValue(usersRef, (snapshot) => {
        const users = snapshotToArray<AppUser>(snapshot);
        setStats(prev => ({ ...prev, userCount: users.length }));
        setLoading(false);
    }, (error) => {
        console.error("Failed to fetch user stats:", error);
        setLoading(false);
    }));

    unsubs.push(onValue(storesRef, (snapshot) => {
        const stores = snapshotToArray<StoreType>(snapshot);
        setStats(prev => ({ ...prev, storeCount: stores.length }));
    }, (error) => {
        console.error("Failed to fetch store stats:", error);
    }));
    
    setAnalyticsLoading(true);
    getWebVisits()
      .then(setAnalyticsStats)
      .finally(() => setAnalyticsLoading(false));
    
    return () => {
        unsubs.forEach(unsub => unsub());
    }

  }, [isAdmin]);

  const statsLoading = loading || analyticsLoading;

  if (statsLoading) {
    return (
        <div className="space-y-8">
            <div className="text-left">
              <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
              <p className="mt-1 text-lg text-muted-foreground">System-wide overview and management tools.</p>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-12"/>
                        <Skeleton className="h-4 w-32 mt-2"/>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-12"/>
                        <Skeleton className="h-4 w-32 mt-2"/>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Users (7 days)</CardTitle>
                        <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-12"/>
                        <Skeleton className="h-4 w-32 mt-2"/>
                    </CardContent>
                </Card>
             </div>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="mt-1 text-lg text-muted-foreground">System-wide overview and management tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.userCount}</div>
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
                <div className="text-2xl font-bold">{stats.storeCount}</div>
                <p className="text-xs text-muted-foreground">
                All created stores on the platform.
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Users (7 days)</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {analyticsStats?.error ? (
                  <div className="text-sm text-destructive font-semibold" title={analyticsStats.error}>
                      Error
                  </div>
                ) : (
                  <div className="text-2xl font-bold">
                      {analyticsStats?.activeUsers || '0'}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                    From Google Analytics
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
