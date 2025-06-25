
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Customer } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Types for Cash IO Reports
type CustomerCashIOData = {
    cashIn: number;
    cashOut: number;
    cashInFee: number;
    cashOutFee: number;
    cashInTotal: number;
    cashOutTotal: number;
    totalAmount: number;
    totalFee: number;
};

type ReportEntry = CustomerCashIOData & {
    customers: { [customerId: string]: CustomerCashIOData };
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
  cashInFee: {
    label: 'Cash In Fees',
    color: 'hsl(var(--chart-1))',
  },
  cashOutFee: {
    label: 'Cash Out Fees',
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
        return sortedData.map(entry => ({
            name: entry.key,
            cashInFee: entry.cashInFee || 0,
            cashOutFee: entry.cashOutFee || 0,
        })).reverse();
    }, [sortedData]);

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

    if (!data) {
        return <div className="text-center py-16"><p className="text-lg text-muted-foreground">No data available for this period.</p></div>;
    }

    const summary = sortedData[0] || { totalFee: 0, totalAmount: 0, cashInTotal: 0, cashOutTotal: 0, customers: {} };

    const customerBreakdown = useMemo(() => {
        const aggregatedCustomers: { [id: string]: CustomerCashIOData & { id: string, name: string } } = {};
        sortedData.forEach(period => {
            Object.entries(period.customers || {}).forEach(([id, stats]) => {
                if (!aggregatedCustomers[id]) {
                    aggregatedCustomers[id] = { ...stats, id, name: customerMap.get(id) || 'Unknown Customer' };
                } else {
                    Object.keys(stats).forEach(key => {
                        (aggregatedCustomers[id] as any)[key] = ((aggregatedCustomers[id] as any)[key] || 0) + (stats as any)[key];
                    });
                }
            });
        });
        return Object.values(aggregatedCustomers).sort((a, b) => b.totalFee - a.totalFee);
    }, [sortedData, customerMap]);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{summary.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount Transacted</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash In (Amount)</CardTitle>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{summary.cashInTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash Out (Amount)</CardTitle>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{summary.cashOutTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Fee Generation Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart data={chartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXAxis} />
                            <YAxis tickFormatter={(value) => `₱${value}`} />
                            <Tooltip cursor={false} content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="cashInFee" fill="var(--color-cashInFee)" radius={4} stackId="a" />
                            <Bar dataKey="cashOutFee" fill="var(--color-cashOutFee)" radius={4} stackId="a" />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Cash IO by Customer</CardTitle>
                    <CardDescription>Breakdown of ordered transactions by customer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">Cash In</TableHead>
                                <TableHead className="text-right">Cash Out</TableHead>
                                <TableHead className="text-right">Total Fees</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customerBreakdown.map(customer => (
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
                                    <TableCell className="text-right">₱{(customer.cashInTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right">₱{(customer.cashOutTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right">₱{(customer.totalFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default function CashIOAnalytics() {
    const [reports, setReports] = useState<AllReports | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);

    useEffect(() => {
        let reportsLoaded = false;
        let customersLoaded = false;

        const checkLoading = () => {
            if(reportsLoaded && customersLoaded) setIsLoading(false);
        }

        const reportsRef = ref(db, 'cashIOReports');
        const unsubscribeReports = onValue(reportsRef, (snapshot) => {
            setReports(snapshot.exists() ? snapshot.val() : null);
            reportsLoaded = true;
            checkLoading();
        });

        const customersRef = ref(db, 'customers');
        const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
            setCustomers(snapshotToArray<Customer>(snapshot));
            customersLoaded = true;
            checkLoading();
        });

        return () => {
            unsubscribeReports();
            unsubscribeCustomers();
        }
    }, []);

    if (isLoading) {
        return <div className="space-y-6"><Skeleton className="h-[120px]" /><Skeleton className="h-[300px]" /><Skeleton className="h-[200px]" /></div>;
    }
    
    if (!reports) {
        return <div className="text-center py-16"><h2 className="text-xl font-semibold">No Cash IO Data Found</h2><p className="text-muted-foreground mt-2">Process some Cash IO orders to see reports here.</p></div>;
    }

    return (
        <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                <TabsTrigger value="overall">Overall</TabsTrigger>
            </TabsList>
            <TabsContent value="daily"><ReportView data={reports.daily} periodName="Daily" customerMap={customerMap} /></TabsContent>
            <TabsContent value="weekly"><ReportView data={reports.weekly} periodName="Weekly" customerMap={customerMap} /></TabsContent>
            <TabsContent value="monthly"><ReportView data={reports.monthly} periodName="Monthly" customerMap={customerMap} /></TabsContent>
            <TabsContent value="yearly"><ReportView data={reports.yearly} periodName="Yearly" customerMap={customerMap} /></TabsContent>
            <TabsContent value="overall"><ReportView data={reports.overall} periodName="Overall" customerMap={customerMap} /></TabsContent>
        </Tabs>
    );
}
