

'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, Unsubscribe } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, Hash, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { getReportPaths } from '@/lib/utils';
import { PrintingReportData } from '@/lib/types';
import { getReportData, setReportData } from '@/lib/offline';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/hooks/use-auth';

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

const chartConfig = {
  totalSales: {
    label: 'Total Sales',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const ReportView = ({ data, periodName }: { data?: ReportPeriodData; periodName: string }) => {
    const sortedData = useMemo(() => {
        if (!data) return [];
        const entries = Object.entries(data).map(([key, value]) => ({ key, ...value }));
        return entries.sort((a, b) => b.key.localeCompare(a.key));
    }, [data]);
    
    const chartData = useMemo(() => {
        if (!sortedData) return [];
        return sortedData.map(entry => ({
            name: entry.key,
            totalSales: entry.totalSales || 0,
        })).reverse();
    }, [sortedData]);
    
    const summary = useMemo(() => {
        if (!sortedData || sortedData.length === 0) {
            return { totalSales: 0, totalQuantity: 0, averageSales: 0 };
        }
    
        const currentYear = new Date().getFullYear().toString();
        const dataForSummary = ['Weekly', 'Monthly'].includes(periodName)
            ? sortedData.filter(d => d.key.startsWith(currentYear))
            : sortedData;

        if (dataForSummary.length === 0 && (['Weekly', 'Monthly'].includes(periodName))) {
            return { totalSales: 0, totalQuantity: 0, averageSales: 0 };
        }
        
        const sourceForTotals = dataForSummary.length > 0 ? dataForSummary : sortedData;

        const totals = sourceForTotals.reduce((acc, entry) => {
            acc.totalSales += entry.totalSales || 0;
            if(entry.byServiceType) {
              acc.totalQuantity += Object.values(entry.byServiceType).reduce((sum, s) => sum + s.count, 0);
            }
            return acc;
        }, { totalSales: 0, totalQuantity: 0 });

        const periodCount = sourceForTotals.length;
        return {
            ...totals,
            averageSales: totals.totalSales / periodCount,
        };
    }, [sortedData, periodName]);


    const serviceTypeBreakdown = useMemo(() => {
        if (!sortedData) return [];
        const aggregated: PrintingReportData['byServiceType'] = {};
        sortedData.forEach(period => {
             Object.entries(period.byServiceType || {}).forEach(([name, stats]) => {
                if (!aggregated[name]) {
                    aggregated[name] = { count: 0, sales: 0, bySize: {} };
                }
                aggregated[name].count += stats.count;
                aggregated[name].sales += stats.sales;
                Object.entries(stats.bySize).forEach(([size, count]) => {
                    aggregated[name].bySize[size] = (aggregated[name].bySize[size] || 0) + count;
                });
            });
        });
        return Object.entries(aggregated).map(([name, stats]) => ({ name, ...stats }))
            .sort((a,b) => b.sales - a.sales);
    }, [sortedData]);

    if (!data) {
        return <div className="text-center py-16"><p className="text-lg text-muted-foreground">No data available for this period.</p></div>;
    }
    
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
    
    const showAverage = ['Weekly', 'Monthly', 'Yearly', 'Last 30 Days'].includes(periodName);
    const avgPeriodName = periodName.replace('ly', '').toLowerCase().replace('last 30 days', 'day');

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(summary.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        {showAverage && <p className="text-xs text-muted-foreground">₱{summary.averageSales.toFixed(2)} avg/{avgPeriodName}</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(summary.totalQuantity || 0).toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Printing Sales Trends</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart data={chartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXAxis} />
                            <YAxis tickFormatter={(value) => `₱${value}`} />
                            <Tooltip cursor={false} content={<ChartTooltipContent />} />
                            <Bar dataKey="totalSales" fill="var(--color-totalSales)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Breakdown by Service Type</CardTitle>
                    <CardDescription>Click on a service to see size breakdown.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                         {serviceTypeBreakdown.map(service => (
                            <AccordionItem value={service.name} key={service.name}>
                                <AccordionTrigger className="hover:no-underline group">
                                     <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                            <span className="font-medium">{service.name}</span>
                                        </div>
                                        <div className="flex items-center gap-8 pr-4">
                                            <span className="text-right">{service.count.toLocaleString()} pcs</span>
                                            <span className="text-right font-semibold">₱{service.sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                     </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                     <div className="bg-muted/50 p-4 pl-14">
                                        <h4 className="font-semibold mb-2">Size Breakdown for {service.name}</h4>
                                         {service.bySize && Object.keys(service.bySize).length > 0 ? (
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
                                         ) : (
                                            <p className="text-sm text-muted-foreground">No size breakdown available for this service.</p>
                                         )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
};

export default function PrintingAnalytics() {
    const { activeStoreId } = useAuth();
    const [reports, setReports] = useState<AllReports | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!activeStoreId) {
            setIsLoading(false);
            return;
        }
        let unsubscribeReports: Unsubscribe | null = null;
        const loadFromCache = async () => {
            const cachedReports = await getReportData<AllReports>('printingReports');
            if (cachedReports) {
                setReports(cachedReports);
                setIsLoading(false);
            }
        };
        loadFromCache();

        unsubscribeReports = onValue(ref(db, `storeData/${activeStoreId}/printingReports`), (snapshot) => {
            const reportData = snapshot.exists() ? snapshot.val() : null;
            setReports(reportData);
            setReportData('printingReports', reportData);
            setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            setIsLoading(false);
        });

        return () => {
            if (unsubscribeReports) unsubscribeReports();
        };
    }, [activeStoreId]);
    
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
            <TabsContent value="weekly"><ReportView data={reports.weekly} periodName="Weekly" /></TabsContent>
            <TabsContent value="monthly"><ReportView data={reports.monthly} periodName="Monthly" /></TabsContent>
            <TabsContent value="yearly"><ReportView data={reports.yearly} periodName="Yearly" /></TabsContent>
            <TabsContent value="overall"><ReportView data={reports.overall} periodName="Overall" /></TabsContent>
        </Tabs>
    );
}
