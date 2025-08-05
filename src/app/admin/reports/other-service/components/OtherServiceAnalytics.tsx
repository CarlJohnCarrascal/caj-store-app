
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, Wrench, Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
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


const ReportView = ({ data, periodName }: { data?: ReportPeriodData; periodName: string }) => {
    if (!data) {
        return <div className="text-center py-16"><p className="text-lg text-muted-foreground">No data available for this period.</p></div>;
    }

    const sortedData = useMemo(() => {
        if (!data) return [];
        const entries = Object.entries(data).map(([key, value]) => ({ key, ...value }));
        return entries.sort((a, b) => b.key.localeCompare(a.key));
    }, [data]);

     const chartData = useMemo(() => {
        return sortedData.map(entry => ({
            name: entry.key,
            totalCost: entry.totalCost || 0,
            totalFee: entry.totalFee || 0,
        })).reverse();
    }, [sortedData]);

    const summary = useMemo(() => {
        if (!sortedData || sortedData.length === 0) {
            return { totalCost: 0, totalFee: 0, totalOrders: 0 };
        }
    
        if (sortedData.length === 1 && periodName !== "Last 30 Days") {
            return sortedData[0];
        }
    
        return sortedData.reduce((acc, entry) => {
            acc.totalCost += entry.totalCost || 0;
            acc.totalFee += entry.totalFee || 0;
            acc.totalOrders += entry.totalOrders || 0;
            return acc;
        }, { totalCost: 0, totalFee: 0, totalOrders: 0 });
    }, [sortedData, periodName]);

    const formatXAxis = (value: string) => {
        if (!value || typeof value !== 'string') return '';
        try {
            if (periodName === 'Weekly') {
                const [, week] = value.split('-');
                return week ? `W${week}` : value;
            }
            if (periodName === 'Monthly') {
                return format(new Date(value), 'MMM yyyy');
            }
            if (periodName === 'Yearly' || periodName === 'Overall') {
                return value;
            }
            return format(new Date(value), 'MMM dd');
        } catch(e) {
            return value;
        }
    };


    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Fees (Profit)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(summary.totalFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(summary.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(summary.totalOrders || 0).toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Other Services Trends</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart data={chartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXAxis} />
                            <YAxis tickFormatter={(value) => `₱${value}`} />
                            <Tooltip cursor={false} content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="totalCost" fill="var(--color-totalCost)" radius={4} stackId="a" />
                            <Bar dataKey="totalFee" fill="var(--color-totalFee)" radius={4} stackId="a" />
                        </BarChart>
                    </ChartContainer>
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
        return Object.fromEntries(last30DaysEntries);
    }, [reports]);

    const todayData = useMemo(() => {
        if (!reports?.daily) return undefined;
        const { daily: todayPath } = getReportPaths(new Date().toISOString());
        const todayReportKey = todayPath.split('/').pop()!;
        const entry = reports.daily[todayReportKey];
        return entry ? { [todayReportKey]: entry } : undefined;
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
            <TabsContent value="weekly"><ReportView data={reports.weekly} periodName="Weekly" /></TabsContent>
            <TabsContent value="monthly"><ReportView data={reports.monthly} periodName="Monthly" /></TabsContent>
            <TabsContent value="yearly"><ReportView data={reports.yearly} periodName="Yearly" /></TabsContent>
            <TabsContent value="overall"><ReportView data={reports.overall} periodName="Overall" /></TabsContent>
        </Tabs>
    );
}
