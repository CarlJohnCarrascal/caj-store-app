'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
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
import { regenerateCashIOReportsAction } from '@/lib/actions';


export default function CashIOReportFixPage() {
    const { toast } = useToast();
    const { appUser } = useAuth();
    const [isPending, startTransition] = useTransition();

    const handleRegenerateReports = () => {
        if (!appUser) {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'You must be logged in to perform this action.',
            });
            return;
        }

        startTransition(async () => {
            try {
                await regenerateCashIOReportsAction({ userId: appUser.id, userName: appUser.name });
                toast({
                    title: 'Success!',
                    description: 'CashIO reports have been successfully regenerated.',
                });
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Operation Failed',
                    description: error.message || 'An unknown error occurred while regenerating reports.',
                });
            }
        });
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Cash IO Report Fix</h1>
                <p className="text-muted-foreground">System maintenance tools for ensuring data integrity.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Regenerate All Cash IO Reports</CardTitle>
                    <CardDescription>
                        This tool will read all existing Cash IO transactions and recalculate the entire report history from scratch. Use this if you suspect any discrepancies in the Cash IO reports.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                            This is a destructive action that will replace all existing Cash IO report data. This process may take a few moments depending on the number of transactions. Do not navigate away from the page while it's running.
                        </AlertDescription>
                    </Alert>
                </CardContent>
                <CardFooter>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isPending}>
                                <History className="mr-2 h-4 w-4" />
                                {isPending ? 'Regenerating...' : 'Regenerate Cash IO Reports'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete and replace all existing Cash IO reports. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRegenerateReports} disabled={isPending}>
                                {isPending ? 'Processing...' : 'Yes, Regenerate Reports'}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
