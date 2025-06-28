'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
    const { signOut, user } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/signin');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-amber-500/10 p-3 rounded-full w-fit">
                        <ShieldAlert className="h-12 w-12 text-amber-500" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">Access Pending</CardTitle>
                    <CardDescription>
                        Your account is pending authorization from an administrator.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        You do not have permission to view the admin dashboard yet. Please contact an admin to grant you access.
                    </p>
                    <p className="text-xs text-muted-foreground">Logged in as: {user?.email}</p>
                    <Button onClick={handleSignOut} variant="outline" className="w-full">
                        Sign Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
