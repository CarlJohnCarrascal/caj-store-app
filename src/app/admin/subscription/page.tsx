'use client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function SubscriptionPage() {
    const { appUser, loading } = useAuth();

    if (loading || !appUser) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-9 w-72" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const { subscriptionTier, subscriptionStatus, aiUsage } = appUser;
    const monthlyTokens = aiUsage?.monthlyTokens || 0;
    const monthlyCost = aiUsage?.monthlyCost || 0;
    
    // Example limit for pro tier
    const tokenLimit = subscriptionTier === 'pro' ? 1000000 : 50000;
    const tokenUsagePercent = Math.min((monthlyTokens / tokenLimit) * 100, 100);
    
    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold">Subscription &amp; Usage</h1>
             <Card>
                <CardHeader>
                    <CardTitle>Your Plan</CardTitle>
                    <CardDescription>Details about your current subscription.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tier</span>
                        <Badge variant="secondary" className="text-lg capitalize">{subscriptionTier || 'free'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className="text-base capitalize">{subscriptionStatus || 'inactive'}</Badge>
                    </div>
                </CardContent>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Monthly AI Usage</CardTitle>
                    <CardDescription>Your token and cost usage for the current billing cycle.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Tokens Used</span>
                            <span className="text-sm text-muted-foreground">{monthlyTokens.toLocaleString()} / {tokenLimit.toLocaleString()}</span>
                        </div>
                        <Progress value={tokenUsagePercent} />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Estimated Monthly Cost</span>
                        <span className="font-semibold text-xl">~${monthlyCost.toFixed(4)}</span>
                    </div>
                </CardContent>
             </Card>
        </div>
    );
}
