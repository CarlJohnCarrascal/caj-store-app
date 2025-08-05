
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Wrench, Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays } from 'date-fns';
import { getReportPaths } from '@/lib/utils';
import { OtherServiceReportData } from '@/lib/types';
import { getReportData, setReportData } from '@/lib/offline';

type ReportPeriodData = {
    [key: string]: OtherServiceReportData;
};

type AllReports = {
    daily?: ReportPeriodData;
    weekly?: ReportPeriodData;
    monthly?: ReportPeriodData;
    yearly?: ReportPeriodData;
    overall?: ReportPeriodData;
};

const ReportView = ({ data, periodName }: { data?: OtherServiceReportData; periodName: string }) => {
    if (!data) {
        return <div className="text-center py-16"><p className="text-lg text-muted-foreground">No data available for this period.</p></div>;
    }

    const { totalCost, totalFee, totalOrders } = data;

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Fees (Profit)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(totalFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(totalOrders || 0).toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This report tracks the total cost and fees generated from miscellaneous services entered in the "Other Services" POS page.</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default function OtherServiceAnalytics() {
    const [reports, setReports] = useState<AllReports | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadFromCache = async () => {
            const cachedReports = await getReportData<AllReports>('otherServiceReports');
            if (cachedReports) {
                setReports(cachedReports);
                setIsLoading(false);
            }
        };
        loadFromCache();

        const reportsRef = ref(db, 'otherServiceReports');
        const unsubscribeReports = onValue(reportsRef, (snapshot) => {
            const reportData = snapshot.exists() ? snapshot.val() : null;
            setReports(reportData);
            setReportData('otherServiceReports', reportData);
            setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            setIsLoading(false);
        });

        return () => unsubscribeReports();
    }, []);
    
    const aggregateReportData = (periodData?: ReportPeriodData): OtherServiceReportData | undefined => {
        if (!periodData) return undefined;
        const aggregated: OtherServiceReportData = { totalCost: 0, totalFee: 0, totalOrders: 0 };
        Object.values(periodData).forEach(entry => {
            aggregated.totalCost += entry.totalCost || 0;
            aggregated.totalFee += entry.totalFee || 0;
            aggregated.totalOrders += entry.totalOrders || 0;
        });
        return aggregated;
    };

    const todayData = useMemo(() => {
        if (!reports?.daily) return undefined;
        const { daily: todayPath } = getReportPaths(new Date().toISOString());
        const todayReportKey = todayPath.split('/').pop()!;
        return reports.daily[todayReportKey];
    }, [reports]);

    const last30DaysData = useMemo(() => {
        if (!reports?.daily) return undefined;
        const dailyEntries = Object.entries(reports.daily);
        const thirtyDaysAgo = subDays(new Date(), 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const last30DaysEntries = dailyEntries.filter(([key]) => {
            try {
                return new Date(key) >= thirtyDaysAgo;
            } catch (e) {
                return false;
            }
        });

        if (last30DaysEntries.length === 0) return undefined;
        return aggregateReportData(Object.fromEntries(last30DaysEntries));
    }, [reports]);

    if (isLoading) {
        return <div className="space-y-6"><Skeleton className="h-[120px]" /><Skeleton className="h-[300px]" /></div>;
    }
    
    if (!reports) {
        return <div className="text-center py-16"><h2 className="text-xl font-semibold">No Other Service Data Found</h2><p className="text-muted-foreground mt-2">Process some transactions to see reports here.</p></div>;
    }

    return (
        <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="daily">Last 30 Days</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                <TabsTrigger value="overall">Overall</TabsTrigger>
            </TabsList>
            <TabsContent value="today"><ReportView data={todayData} periodName="Today" /></TabsContent>
            <TabsContent value="daily"><ReportView data={last30DaysData} periodName="Last 30 Days" /></TabsContent>
            <TabsContent value="weekly"><ReportView data={aggregateReportData(reports.weekly)} periodName="Weekly" /></TabsContent>
            <TabsContent value="monthly"><ReportView data={aggregateReportData(reports.monthly)} periodName="Monthly" /></TabsContent>
            <TabsContent value="yearly"><ReportView data={aggregateReportData(reports.yearly)} periodName="Yearly" /></TabsContent>
            <TabsContent value="overall"><ReportView data={aggregateReportData(reports.overall)} periodName="Overall" /></TabsContent>
        </Tabs>
    );
}
