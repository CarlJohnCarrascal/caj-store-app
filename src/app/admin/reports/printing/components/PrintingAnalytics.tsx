
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Printer, Hash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays } from 'date-fns';
import { getReportPaths } from '@/lib/utils';
import { PrintingReportData } from '@/lib/types';
import { getReportData, setReportData } from '@/lib/offline';

type ReportPeriodData = {
    [key: string]: PrintingReportData;
};

type AllReports = {
    daily?: ReportPeriodData;
    weekly?: ReportPeriodData;
    monthly?: ReportPeriodData;
    yearly?: ReportPeriodData;
    overall?: ReportPeriodData;
};

const ReportView = ({ data, periodName }: { data?: PrintingReportData; periodName: string }) => {
    if (!data) {
        return <div className="text-center py-16"><p className="text-lg text-muted-foreground">No data available for this period.</p></div>;
    }

    const { totalSales, byServiceType, bySize } = data;
    
    const totalQuantity = useMemo(() => {
        if (!byServiceType) return 0;
        return Object.values(byServiceType).reduce((acc, stats) => acc + stats.count, 0);
    }, [byServiceType]);

    const serviceTypeBreakdown = useMemo(() => {
        if (!byServiceType) return [];
        return Object.entries(byServiceType).map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.sales - a.sales);
    }, [byServiceType]);
    
    const sizeBreakdown = useMemo(() => {
        if (!bySize) return [];
        return Object.entries(bySize).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [bySize]);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(totalQuantity || 0).toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Breakdown by Service Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Service Type</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Sales</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {serviceTypeBreakdown.map(service => (
                                    <TableRow key={service.name}>
                                        <TableCell className="font-medium">{service.name}</TableCell>
                                        <TableCell className="text-right">{service.count.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">₱{service.sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Breakdown by Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Size</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sizeBreakdown.map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.count.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default function PrintingAnalytics() {
    const [reports, setReports] = useState<AllReports | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadFromCache = async () => {
            const cachedReports = await getReportData<AllReports>('printingReports');
            if (cachedReports) {
                setReports(cachedReports);
                setIsLoading(false);
            }
        };
        loadFromCache();

        const reportsRef = ref(db, 'printingReports');
        const unsubscribeReports = onValue(reportsRef, (snapshot) => {
            const reportData = snapshot.exists() ? snapshot.val() : null;
            setReports(reportData);
            setReportData('printingReports', reportData);
            setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            setIsLoading(false);
        });

        return () => unsubscribeReports();
    }, []);
    
    const aggregateReportData = (periodData?: ReportPeriodData): PrintingReportData | undefined => {
        if (!periodData) return undefined;
        const aggregated: PrintingReportData = { totalSales: 0, byServiceType: {}, bySize: {} };
        Object.values(periodData).forEach(entry => {
            aggregated.totalSales += entry.totalSales || 0;
            Object.entries(entry.byServiceType || {}).forEach(([name, stats]) => {
                if (!aggregated.byServiceType[name]) {
                    aggregated.byServiceType[name] = { count: 0, sales: 0 };
                }
                aggregated.byServiceType[name].count += stats.count || 0;
                aggregated.byServiceType[name].sales += stats.sales || 0;
            });
             Object.entries(entry.bySize || {}).forEach(([name, count]) => {
                if (!aggregated.bySize[name]) {
                    aggregated.bySize[name] = 0;
                }
                aggregated.bySize[name] += count || 0;
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
        return <div className="text-center py-16"><h2 className="text-xl font-semibold">No Printing Data Found</h2><p className="text-muted-foreground mt-2">Process some printing jobs to see reports here.</p></div>;
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
