
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, Smartphone, Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { getReportPaths } from '@/lib/utils';
import { EloadingReportData } from '@/lib/types';
import { getReportData, setReportData } from '@/lib/offline';

type ReportPeriodData = {
    [key: string]: EloadingReportData;
};

type AllReports = {
    daily?: ReportPeriodData;
    weekly?: ReportPeriodData;
    monthly?: ReportPeriodData;
    yearly?: ReportPeriodData;
    overall?: ReportPeriodData;
};

const chartConfig = {
  totalFee: {
    label: 'Total Fees',
    color: 'hsl(var(--chart-1))',
  },
  totalCost: {
    label: 'Total Cost',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const ReportView = ({ data, periodName }: { data?: EloadingReportData; periodName: string }) => {
    if (!data) {
        return <div className="text-center py-16"><p className="text-lg text-muted-foreground">No data available for this period.</p></div>;
    }

    const { totalCost, totalFee, byServiceType } = data;

    const serviceTypeBreakdown = useMemo(() => {
        if (!byServiceType) return [];
        return Object.entries(byServiceType).map(([name, stats]) => ({ name, ...stats }))
            .sort((a,b) => b.fee - a.fee);
    }, [byServiceType]);

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
                        <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(serviceTypeBreakdown.reduce((acc, s) => acc + s.count, 0)).toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Breakdown by Service Type</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service Type</TableHead>
                                <TableHead className="text-right">Transactions</TableHead>
                                <TableHead className="text-right">Total Cost</TableHead>
                                <TableHead className="text-right">Total Fees</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {serviceTypeBreakdown.map(service => (
                                <TableRow key={service.name}>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell className="text-right">{service.count.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">₱{service.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right">₱{service.fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default function EloadingAnalytics() {
    const [reports, setReports] = useState<AllReports | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadFromCache = async () => {
            const cachedReports = await getReportData<AllReports>('eloadingReports');
            if (cachedReports) {
                setReports(cachedReports);
                setIsLoading(false);
            }
        };
        loadFromCache();

        const reportsRef = ref(db, 'eloadingReports');
        const unsubscribeReports = onValue(reportsRef, (snapshot) => {
            const reportData = snapshot.exists() ? snapshot.val() : null;
            setReports(reportData);
            setReportData('eloadingReports', reportData);
            setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            setIsLoading(false);
        });

        return () => unsubscribeReports();
    }, []);
    
    const aggregateReportData = (periodData?: ReportPeriodData): EloadingReportData | undefined => {
        if (!periodData) return undefined;
        const aggregated: EloadingReportData = { totalCost: 0, totalFee: 0, byServiceType: {} };
        Object.values(periodData).forEach(entry => {
            aggregated.totalCost += entry.totalCost || 0;
            aggregated.totalFee += entry.totalFee || 0;
            Object.entries(entry.byServiceType || {}).forEach(([name, stats]) => {
                if (!aggregated.byServiceType[name]) {
                    aggregated.byServiceType[name] = { count: 0, cost: 0, fee: 0 };
                }
                aggregated.byServiceType[name].count += stats.count || 0;
                aggregated.byServiceType[name].cost += stats.cost || 0;
                aggregated.byServiceType[name].fee += stats.fee || 0;
            });
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
        return <div className="text-center py-16"><h2 className="text-xl font-semibold">No E-loading Data Found</h2><p className="text-muted-foreground mt-2">Process some e-loading transactions to see reports here.</p></div>;
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
