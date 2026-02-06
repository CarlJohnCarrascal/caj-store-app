

'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, Unsubscribe } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, ShoppingCart, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import type { Customer } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getReportPaths } from '@/lib/utils';
import { getReportData, setReportData, getStoreData, setStoreData } from '@/lib/offline';
import { useAuth } from '@/hooks/use-auth';

// Types for Customer Reports
type ActiveCustomerData = {
    orderCount: number;
    totalValue: number;
};

type ReportEntry = {
    newCustomerCount: number;
    totalOrders: number;
    totalOrderValue: number;
    activeCustomers: { [customerId: string]: ActiveCustomerData };
};

type ReportPeriodData = {
    [key: string]: ReportEntry;
};

type AllReports = {
    daily?: ReportPeriodData;
    weekly?: ReportPeriodData;
    monthly?: ReportPeriodData;
    yearly?: ReportPeriodData;
    overall?: ReportPeriodData;
};

// Helper function to convert snapshot to array
function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
    const items: (T & { id: string })[] = [];
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot: any) => {
        items.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
        });
        });
    }
    return items;
}

const chartConfig = {
  newCustomerCount: {
    label: 'New Customers',
    color: 'hsl(var(--chart-1))',
  },
  totalOrders: {
    label: 'Total Orders',
    color: 'hsl(var(--chart-2))',
  }
} satisfies ChartConfig;


const ReportView = ({ data, periodName, customerMap }: { data?: ReportPeriodData; periodName: string; customerMap: Map<string, string> }) => {
    const sortedData = useMemo(() => {
        if (!data) return [];
        const entries = Object.entries(data).map(([key, value]) => ({ key, ...value }));
        return entries.sort((a, b) => b.key.localeCompare(a.key));
    }, [data]);
    
    const chartData = useMemo(() => {
        if (!sortedData) return [];
        return sortedData.map(entry => ({
            name: entry.key,
            newCustomerCount: entry.newCustomerCount || 0,
            totalOrders: entry.totalOrders || 0,
        })).reverse();
    }, [sortedData]);

    const summary = useMemo(() => {
        if (!sortedData || sortedData.length === 0) {
            return { newCustomerCount: 0, totalOrders: 0, totalOrderValue: 0, averageOrderValue: 0, averageOrders: 0, averageNewCustomers: 0 };
        }
    
        const currentYear = new Date().getFullYear().toString();
        const dataForSummary = ['Weekly', 'Monthly'].includes(periodName)
            ? sortedData.filter(d => d.key.startsWith(currentYear))
            : sortedData;

        if (dataForSummary.length === 0 && (['Weekly', 'Monthly'].includes(periodName))) {
            return { newCustomerCount: 0, totalOrders: 0, totalOrderValue: 0, averageOrderValue: 0, averageOrders: 0, averageNewCustomers: 0 };
        }

        const sourceForTotals = dataForSummary.length > 0 ? dataForSummary : sortedData;

        const totals = sourceForTotals.reduce((acc, entry) => {
            acc.newCustomerCount += entry.newCustomerCount || 0;
            acc.totalOrders += entry.totalOrders || 0;
            acc.totalOrderValue += entry.totalOrderValue || 0;
            return acc;
        }, { newCustomerCount: 0, totalOrders: 0, totalOrderValue: 0 });

        const periodCount = sourceForTotals.length;
        return {
            ...totals,
            averageOrderValue: totals.totalOrderValue / periodCount,
            averageOrders: totals.totalOrders / periodCount,
            averageNewCustomers: totals.newCustomerCount / periodCount,
        };
    }, [sortedData, periodName]);

    const allActiveCustomers = useMemo(() => {
        if (!sortedData) return [];
        const aggregatedCustomers: { [id: string]: ActiveCustomerData & { id: string, name: string } } = {};
        sortedData.forEach(period => {
            Object.entries(period.activeCustomers || {}).forEach(([id, stats]) => {
                if (!aggregatedCustomers[id]) {
                    aggregatedCustomers[id] = { ...stats, id, name: customerMap.get(id) || 'Unknown Customer' };
                } else {
                    aggregatedCustomers[id].orderCount += stats.orderCount;
                    aggregatedCustomers[id].totalValue += stats.totalValue;
                }
            });
        });
        return Object.values(aggregatedCustomers).sort((a, b) => b.totalValue - a.totalValue);
    }, [sortedData, customerMap]);

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
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Order Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{summary.totalOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        {showAverage && <p className="text-xs text-muted-foreground">₱{summary.averageOrderValue.toFixed(2)} avg/{avgPeriodName}</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalOrders.toLocaleString()}</div>
                        {showAverage && <p className="text-xs text-muted-foreground">{summary.averageOrders.toFixed(1)} avg/{avgPeriodName}</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{summary.newCustomerCount.toLocaleString()}</div>
                        {showAverage && <p className="text-xs text-muted-foreground">{summary.averageNewCustomers.toFixed(1)} avg/{avgPeriodName}</p>}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Customer & Order Trends</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart data={chartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXAxis} />
                            <YAxis />
                            <Tooltip cursor={false} content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="newCustomerCount" fill="var(--color-newCustomerCount)" radius={4} />
                            <Bar dataKey="totalOrders" fill="var(--color-totalOrders)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Top Customers by Value</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Total Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allActiveCustomers.map(customer => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">
                                        {customer.name === 'Unknown Customer' ? (
                                            <span>{customer.name}</span>
                                        ) : (
                                            <Button variant="link" asChild className="p-0 h-auto">
                                                <Link href={`/admin/customers/${customer.id}`}>
                                                    {customer.name}
                                                </Link>
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">{customer.orderCount.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">₱{customer.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default function CustomerAnalytics() {
    const { activeStoreId } = useAuth();
    const [reports, setReports] = useState<AllReports | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);

    useEffect(() => {
        if (!activeStoreId) {
            setIsLoading(false);
            return;
        }

        let reportsUnsubscribe: Unsubscribe | null = null;
        let customersUnsubscribe: Unsubscribe | null = null;

        const loadFromCache = async () => {
            const cachedReports = await getReportData<AllReports>('customerReports');
            if (cachedReports) setReports(cachedReports);

            const cachedCustomers = await getStoreData<Customer>('customers');
            if (cachedCustomers.length > 0) setCustomers(cachedCustomers);
            
            if (cachedReports && cachedCustomers.length > 0) {
                setIsLoading(false);
            }
        };
        loadFromCache();

        reportsUnsubscribe = onValue(ref(db, `storeData/${activeStoreId}/customerReports`), (snapshot) => {
            const reportData = snapshot.exists() ? snapshot.val() : null;
            setReports(reportData);
            setReportData('customerReports', reportData);
            if (customers.length > 0) setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            if (customers.length > 0) setIsLoading(false);
        });

        customersUnsubscribe = onValue(ref(db, `storeData/${activeStoreId}/customers`), (snapshot) => {
            const customerList = snapshotToArray<Customer>(snapshot);
            setCustomers(customerList);
            setStoreData('customers', customerList);
            if (reports) setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            if (reports) setIsLoading(false);
        });

        return () => {
            if (reportsUnsubscribe) reportsUnsubscribe();
            if (customersUnsubscribe) customersUnsubscribe();
        };
    }, [activeStoreId]);

    const todayData = useMemo(() => {
        if (!reports?.daily) return undefined;
        const { daily: todayPath } = getReportPaths(new Date().toISOString());
        const todayReportKey = todayPath.split('/').pop()!;
        const todayEntry = reports.daily[todayReportKey];
        return todayEntry ? { [todayReportKey]: todayEntry } : undefined;
    }, [reports]);

    const last30DaysData = useMemo(() => {
        if (!reports?.daily) return undefined;
        const dailyEntries = Object.entries(reports.daily);
        const thirtyDaysAgo = subDays(new Date(), 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const last30DaysEntries = dailyEntries.filter(([key]) => {
            try {
                const entryDate = new Date(key);
                return entryDate >= thirtyDaysAgo;
            } catch (e) {
                return false;
            }
        });

        if (last30DaysEntries.length === 0) return undefined;
        return Object.fromEntries(last30DaysEntries);
    }, [reports]);

    if (isLoading) {
        return <div className="space-y-6"><Skeleton className="h-[120px]" /><Skeleton className="h-[300px]" /><Skeleton className="h-[200px]" /></div>;
    }
    
    if (!reports) {
        return <div className="text-center py-16"><h2 className="text-xl font-semibold">No Customer Data Found</h2><p className="text-muted-foreground mt-2">Process some orders to see customer reports here.</p></div>;
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
            <TabsContent value="today"><ReportView data={todayData} periodName="Today" customerMap={customerMap} /></TabsContent>
            <TabsContent value="daily"><ReportView data={last30DaysData} periodName="Last 30 Days" customerMap={customerMap} /></TabsContent>
            <TabsContent value="weekly"><ReportView data={reports.weekly} periodName="Weekly" customerMap={customerMap} /></TabsContent>
            <TabsContent value="monthly"><ReportView data={reports.monthly} periodName="Monthly" customerMap={customerMap} /></TabsContent>
            <TabsContent value="yearly"><ReportView data={reports.yearly} periodName="Yearly" customerMap={customerMap} /></TabsContent>
            <TabsContent value="overall"><ReportView data={reports.overall} periodName="Overall" customerMap={customerMap} /></TabsContent>
        </Tabs>
    );
}
