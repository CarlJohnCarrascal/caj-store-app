
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Hash, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays } from 'date-fns';
import { getReportPaths } from '@/lib/utils';
import { PrintingReportData } from '@/lib/types';
import { getReportData, setReportData } from '@/lib/offline';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

    const { totalSales, byServiceType } = data;
    
    const totalQuantity = useMemo(() => {
        if (!byServiceType) return 0;
        return Object.values(byServiceType).reduce((acc, stats) => acc + stats.count, 0);
    }, [byServiceType]);

    const serviceTypeBreakdown = useMemo(() => {
        if (!byServiceType) return [];
        return Object.entries(byServiceType).map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.sales - a.sales);
    }, [byServiceType]);
    
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
            
            <Card>
                <CardHeader>
                    <CardTitle>Breakdown by Service Type</CardTitle>
                    <CardDescription>Click on a service to see size breakdown.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Service Type</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Sales</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {serviceTypeBreakdown.map(service => (
                                    <AccordionItem value={service.name} key={service.name}>
                                        <AccordionTrigger asChild>
                                           <TableRow className="cursor-pointer">
                                                <TableCell>
                                                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                                </TableCell>
                                                <TableCell className="font-medium">{service.name}</TableCell>
                                                <TableCell className="text-right">{service.count.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">₱{service.sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        </AccordionTrigger>
                                        <AccordionContent asChild>
                                            <tr>
                                                <td colSpan={4} className="p-0">
                                                    <div className="bg-muted/50 p-4 pl-14">
                                                        <h4 className="font-semibold mb-2">Size Breakdown for {service.name}</h4>
                                                         <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Size</TableHead>
                                                                    <TableHead className="text-right">Quantity</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {Object.entries(service.bySize).sort(([,a],[,b])=>b-a).map(([size, count]) => (
                                                                    <TableRow key={size}>
                                                                        <TableCell>{size}</TableCell>
                                                                        <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                         </Table>
                                                    </div>
                                                </td>
                                            </tr>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </TableBody>
                        </Table>
                    </Accordion>
                </CardContent>
            </Card>
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
        const aggregated: PrintingReportData = { totalSales: 0, byServiceType: {} };
        Object.values(periodData).forEach(entry => {
            aggregated.totalSales += entry.totalSales || 0;
            Object.entries(entry.byServiceType || {}).forEach(([name, stats]) => {
                if (!aggregated.byServiceType[name]) {
                    aggregated.byServiceType[name] = { count: 0, sales: 0, bySize: {} };
                }
                aggregated.byServiceType[name].count += stats.count || 0;
                aggregated.byServiceType[name].sales += stats.sales || 0;
                
                Object.entries(stats.bySize || {}).forEach(([size, count]) => {
                    if(!aggregated.byServiceType[name].bySize[size]) {
                        aggregated.byServiceType[name].bySize[size] = 0;
                    }
                    aggregated.byServiceType[name].bySize[size] += count;
                });
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
