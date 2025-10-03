

'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, Unsubscribe } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, ArrowUp, ArrowDown, ArrowRightLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import type { Customer, Account } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getReportPaths } from '@/lib/utils';
import { getReportData, setReportData, getStoreData, setStoreData } from '@/lib/offline';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

type AccountCashIOData = {
    cashInCount: number;
    cashInAmount: number;
    cashInFee: number;
    cashOutCount: number;
    cashOutAmount: number;
    cashOutFee: number;
};

type ReportEntry = {
    totalTransactions: number;
    customers: { [customerId: string]: CustomerCashIOData };
    byAccount?: { [accountId: string]: AccountCashIOData };
    cashIn?: number;
    cashOut?: number;
    cashInFee?: number;
    cashOutFee?: number;
    cashInTotal?: number;
    cashOutTotal?: number;
    totalAmount?: number;
    totalFee?: number;
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

const feeChartConfig = {
  cashInFee: {
    label: 'Cash In Fees',
    color: 'hsl(var(--chart-2))',
  },
  cashOutFee: {
    label: 'Cash Out Fees',
    color: 'hsl(var(--chart-1))',
  }
} satisfies ChartConfig;

const totalAmountChartConfig = {
  cashInTotal: {
    label: 'Cash In Amount',
    color: 'hsl(var(--chart-2))',
  },
  cashOutTotal: {
    label: 'Cash Out Amount',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;


const ReportView = ({ data, periodName, customerMap, accountMap }: { data?: ReportPeriodData; periodName: string; customerMap: Map<string, string>; accountMap: Map<string, string> }) => {
    
    const sortedData = useMemo(() => {
        if (!data) return [];
        const entries = Object.entries(data).map(([key, value]) => ({ key, ...value }));
        return entries.sort((a, b) => b.key.localeCompare(a.key));
    }, [data]);
    
    const feeChartData = useMemo(() => {
        if (!sortedData) return [];
        return sortedData.map(entry => ({
            name: entry.key,
            cashInFee: entry.cashInFee || 0,
            cashOutFee: entry.cashOutFee || 0,
        })).reverse();
    }, [sortedData]);

    const totalAmountChartData = useMemo(() => {
        if (!sortedData) return [];
        return sortedData.map(entry => ({
            name: entry.key,
            cashInTotal: entry.cashInTotal || 0,
            cashOutTotal: entry.cashOutTotal || 0,
        })).reverse();
    }, [sortedData]);

    const summary = useMemo(() => {
        if (!sortedData || sortedData.length === 0) {
            return { totalTransactions: 0, cashIn: 0, cashOut: 0, totalFee: 0, totalAmount: 0, cashInTotal: 0, cashOutTotal: 0, averageTransactions: 0, averageFee: 0 };
        }
        
        const currentYear = new Date().getFullYear().toString();
        const dataForSummary = ['Weekly', 'Monthly'].includes(periodName)
            ? sortedData.filter(d => d.key.startsWith(currentYear))
            : sortedData;

        if (dataForSummary.length === 0 && (['Weekly', 'Monthly'].includes(periodName))) {
             return { totalTransactions: 0, cashIn: 0, cashOut: 0, totalFee: 0, totalAmount: 0, cashInTotal: 0, cashOutTotal: 0, averageTransactions: 0, averageFee: 0 };
        }
        
        const sourceForTotals = dataForSummary.length > 0 ? dataForSummary : sortedData;

        const totals = sourceForTotals.reduce((acc, entry) => {
            acc.totalTransactions += entry.totalTransactions || 0;
            acc.totalFee += entry.totalFee || 0;
            acc.cashInTotal += entry.cashInTotal || 0;
            acc.cashOutTotal += entry.cashOutTotal || 0;
            acc.cashIn += entry.cashIn || 0;
            acc.cashOut += entry.cashOut || 0;
            acc.totalAmount += (entry.cashInTotal || 0) + (entry.cashOutTotal || 0);
            return acc;
        }, {
            totalTransactions: 0,
            cashIn: 0,
            cashOut: 0,
            totalFee: 0,
            cashInTotal: 0,
            cashOutTotal: 0,
            totalAmount: 0,
        });

        const periodCount = sourceForTotals.length;
        return {
            ...totals,
            averageTransactions: totals.totalTransactions / periodCount,
            averageFee: totals.totalFee / periodCount,
        };
    }, [sortedData, periodName]);
    
    const customerBreakdown = useMemo(() => {
        if (!sortedData) return [];
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

    const accountBreakdown = useMemo(() => {
        if (!data) return [];
        const aggregatedAccounts: { [id: string]: AccountCashIOData & { id: string, name: string, periodData: { [periodKey: string]: AccountCashIOData } } } = {};
        
        Object.entries(data).forEach(([periodKey, period]) => {
            Object.entries(period.byAccount || {}).forEach(([id, stats]) => {
                if (!aggregatedAccounts[id]) {
                    aggregatedAccounts[id] = { 
                        ...stats, 
                        id, 
                        name: accountMap.get(id) || 'Unknown Account',
                        periodData: { [periodKey]: stats }
                    };
                } else {
                    Object.keys(stats).forEach(key => {
                        (aggregatedAccounts[id] as any)[key] = ((aggregatedAccounts[id] as any)[key] || 0) + (stats as any)[key];
                    });
                    aggregatedAccounts[id].periodData[periodKey] = stats;
                }
            });
        });

        return Object.values(aggregatedAccounts).sort((a, b) => (b.cashInFee + b.cashOutFee) - (a.cashInFee + a.cashOutFee));
    }, [data, accountMap]);

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
            if (periodName === 'Yearly' || periodName === 'Overall' || periodName === 'Today') {
                return value;
            }
            return format(new Date(value), 'MMM dd');
        } catch(e) {
            return value;
        }
    };
    
    const showAverage = ['Weekly', 'Monthly', 'Yearly', 'Last 30 Days'].includes(periodName);
    const avgPeriodName = periodName.replace('ly', '').toLowerCase().replace('last 30 days', 'day');
    const showAccountBreakdown = ['Weekly', 'Monthly', 'Yearly'].includes(periodName);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(summary.totalTransactions || 0).toLocaleString()}</div>
                        {showAverage && <p className="text-xs text-muted-foreground">{summary.averageTransactions.toFixed(1)} avg/{avgPeriodName}</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(summary.totalFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        {showAverage && <p className="text-xs text-muted-foreground">₱{summary.averageFee.toFixed(2)} avg/{avgPeriodName}</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash In</CardTitle>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(summary.cashInTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">from {(summary.cashIn || 0).toLocaleString()} transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash Out</CardTitle>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{(summary.cashOutTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">from {(summary.cashOut || 0).toLocaleString()} transactions</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Fee Generation Trend</CardTitle>
                    <CardDescription>Total fees generated from cash in and cash out services.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={feeChartConfig} className="min-h-[200px] w-full">
                        <BarChart data={feeChartData} accessibilityLayer>
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
                    <CardTitle>Total Amount Trend</CardTitle>
                    <CardDescription>Cash in vs. cash out amounts transacted.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={totalAmountChartConfig} className="min-h-[200px] w-full">
                        <BarChart data={totalAmountChartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXAxis} />
                            <YAxis tickFormatter={(value) => `₱${value}`} />
                            <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Legend />
                            <Bar dataKey="cashInTotal" fill="var(--color-cashInTotal)" radius={4} />
                            <Bar dataKey="cashOutTotal" fill="var(--color-cashOutTotal)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cash IO by Account</CardTitle>
                    <CardDescription>Breakdown of transactions by your business accounts.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-1/3">Account</TableHead>
                              <TableHead className="text-center">In/Out Count</TableHead>
                              <TableHead className="text-right">Cash In Amt</TableHead>
                              <TableHead className="text-right">Cash Out Amt</TableHead>
                              <TableHead className="text-right">Total Fees</TableHead>
                          </TableRow>
                      </TableHeader>
                    </Table>
                    <Accordion type="multiple" className="w-full">
                        {accountBreakdown.map(account => (
                            <AccordionItem value={account.id} key={account.id} className="border-b">
                                <AccordionTrigger className="hover:no-underline group py-0 px-4">
                                     <Table className="w-full">
                                        <TableBody>
                                            <TableRow className="border-b-0 hover:bg-transparent">
                                                <TableCell className="font-medium w-1/3 flex items-center gap-2">
                                                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                                    {account.name}
                                                </TableCell>
                                                <TableCell className="text-center">{(account.cashInCount || 0).toLocaleString()} / {(account.cashOutCount || 0).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">₱{(account.cashInAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="text-right">₱{(account.cashOutAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="text-right font-semibold">₱{((account.cashInFee || 0) + (account.cashOutFee || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                     </Table>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="bg-muted/50 p-4 pl-12">
                                        <h4 className="font-semibold mb-2">Breakdown for {account.name}</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Period</TableHead>
                                                    <TableHead className="text-center">Cash In/Out</TableHead>
                                                    <TableHead className="text-right">Cash In Amt</TableHead>
                                                    <TableHead className="text-right">Cash Out Amt</TableHead>
                                                    <TableHead className="text-right">Total Fees</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {Object.entries(account.periodData).sort(([keyA], [keyB]) => keyB.localeCompare(keyA)).map(([periodKey, stats]) => (
                                                <TableRow key={periodKey}>
                                                    <TableCell>{formatXAxis(periodKey)}</TableCell>
                                                    <TableCell className="text-center">{stats.cashInCount}/{stats.cashOutCount}</TableCell>
                                                    <TableCell className="text-right">₱{stats.cashInAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="text-right">₱{stats.cashOutAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="text-right">₱{(stats.cashInFee + stats.cashOutFee).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                </TableRow>
                                            ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
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
                                <TableHead className="text-right">Cash In (Count)</TableHead>
                                <TableHead className="text-right">Cash Out (Count)</TableHead>
                                <TableHead className="text-right">Cash In Amount</TableHead>
                                <TableHead className="text-right">Cash Out Amount</TableHead>
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
                                    <TableCell className="text-right">{(customer.cashIn || 0).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{(customer.cashOut || 0).toLocaleString()}</TableCell>
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
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
    const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a.accountName])), [accounts]);

    useEffect(() => {
        let reportsUnsubscribe: Unsubscribe | null = null;
        let customersUnsubscribe: Unsubscribe | null = null;
        let accountsUnsubscribe: Unsubscribe | null = null;

        const loadFromCache = async () => {
            const cachedReports = await getReportData<AllReports>('cashIOReports');
            if (cachedReports) setReports(cachedReports);

            const cachedCustomers = await getStoreData<Customer>('customers');
            if (cachedCustomers.length > 0) setCustomers(cachedCustomers);

            const cachedAccounts = await getStoreData<Account>('accounts');
            if (cachedAccounts.length > 0) setAccounts(cachedAccounts);

            if (cachedReports && cachedCustomers.length > 0 && cachedAccounts.length > 0) {
                setIsLoading(false);
            }
        };
        loadFromCache();

        reportsUnsubscribe = onValue(ref(db, 'cashIOReports'), (snapshot) => {
            const reportData = snapshot.exists() ? snapshot.val() : null;
            if (reportData) {
              setReports(reportData);
              setReportData('cashIOReports', reportData);
            }
            if (customers.length > 0 && accounts.length > 0) setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            if (customers.length > 0 && accounts.length > 0) setIsLoading(false);
        });

        customersUnsubscribe = onValue(ref(db, 'customers'), (snapshot) => {
            const customerList = snapshotToArray<Customer>(snapshot);
            setCustomers(customerList);
            setStoreData('customers', customerList);
            if (reports && accounts.length > 0) setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            if (reports && accounts.length > 0) setIsLoading(false);
        });

        accountsUnsubscribe = onValue(ref(db, 'accounts'), (snapshot) => {
            const accountList = snapshotToArray<Account>(snapshot);
            setAccounts(accountList);
            setStoreData('accounts', accountList);
            if (reports && customers.length > 0) setIsLoading(false);
        }, (error) => {
            console.error("Firebase listener failed:", error);
            if (reports && customers.length > 0) setIsLoading(false);
        });

        return () => {
            if (reportsUnsubscribe) reportsUnsubscribe();
            if (customersUnsubscribe) customersUnsubscribe();
            if (accountsUnsubscribe) accountsUnsubscribe();
        };
    }, []);

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
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const last30DaysEntries = dailyEntries.filter(([key]) => {
            try {
                // 'YYYY-MM-DD' gets parsed as UTC midnight. This is fine for date-level comparison.
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
        return <div className="text-center py-16"><h2 className="text-xl font-semibold">No Cash IO Data Found</h2><p className="text-muted-foreground mt-2">Process some Cash IO orders to see reports here.</p></div>;
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
            <TabsContent value="today"><ReportView data={todayData} periodName="Today" customerMap={customerMap} accountMap={accountMap} /></TabsContent>
            <TabsContent value="daily"><ReportView data={last30DaysData} periodName="Last 30 Days" customerMap={customerMap} accountMap={accountMap} /></TabsContent>
            <TabsContent value="weekly"><ReportView data={reports.weekly} periodName="Weekly" customerMap={customerMap} accountMap={accountMap} /></TabsContent>
            <TabsContent value="monthly"><ReportView data={reports.monthly} periodName="Monthly" customerMap={customerMap} accountMap={accountMap} /></TabsContent>
            <TabsContent value="yearly"><ReportView data={reports.yearly} periodName="Yearly" customerMap={customerMap} accountMap={accountMap} /></TabsContent>
            <TabsContent value="overall"><ReportView data={reports.overall} periodName="Overall" customerMap={customerMap} accountMap={accountMap} /></TabsContent>
        </Tabs>
    );
}
