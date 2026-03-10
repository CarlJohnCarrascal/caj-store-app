import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Super Admin</h1>
        <p className="mt-2 text-lg text-muted-foreground">Manage system-wide settings, stores, and users.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Users</CardTitle>
                <Users className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex-grow">
                <CardDescription>
                    Authorize new users and manage existing user roles and access.
                </CardDescription>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href="/superadmin/users">Manage Users</Link>
                </Button>
            </CardFooter>
        </Card>
        <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Stores</CardTitle>
                <Store className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex-grow">
                <CardDescription>
                    Create, view, and manage all stores across the platform.
                </CardDescription>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href="/superadmin/stores">Manage Stores</Link>
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
