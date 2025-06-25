
'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { DollarSign, Package, Printer, ArrowRightLeft, Smartphone, Wrench, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type ServiceData = {
  orders: number;
  sales: number;
};

type ReportEntry = {
  totalOrders: number;
  totalSales: number;
  byService: { [serviceName: string]: ServiceData };
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

const serviceIcons: { [key: string]: ReactNode } = {
  Store: <Package className="h-4 w-4 text-muted-foreground" />,
  Printing: <Printer className="h-4 w-4 text-muted-foreground" />,
  CashIO: <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />,
  'E-loading': <Smartphone className="h-4 w-4 text-muted-foreground" />,
  'Other Service': <Wrench className="h-4 w-4 text-muted-foreground" />,
};

const chartConfig = {
  totalSales: {
    label: 'Total Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const ReportView = ({ data, periodName }: { data?: ReportPeriodData; periodName: string }) => {
  const sortedData = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data).map(([key, value]) => ({ key, ...value }));

    if (periodName === 'Overall') {
        return entries;
    }

    return entries.sort((a, b) => {
        if (periodName === 'Weekly') {
            const [yearA, weekA] = a.key.split('-').map(Number);
            const [yearB, weekB] = b.key.split('-').map(Number);
            if (yearA && yearB && weekA && weekB) {
                if (yearB !== yearA) return yearB - yearA;
                return weekB - weekA;
            }
        }
        
        try {
            const dateA = new Date(a.key);
            const dateB = new Date(b.key);
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                return dateB.getTime() - dateA.getTime();
            }
        } catch(e) {
            // Fallback for any parsing error
        }
        
        return b.key.localeCompare(a.key);
    });
  }, [data, periodName]);

  const chartData = useMemo(() => {
    return sortedData.map(entry => ({
      name: entry.key,
      totalSales: entry.totalSales,
    })).reverse(); // Reverse for chronological order in chart
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
        if (periodName === 'Yearly') {
            return value;
        }
        if (periodName === 'Overall') {
            return 'Overall';
        }
        // Default for Daily
        return format(new Date(value), 'MMM dd');
    } catch(e) {
        return value; // Fallback to raw value if formatting fails
    }
  };


  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-muted-foreground">No data available for this period.</p>
      </div>
    );
  }

  // Use the first (most recent) entry for summary cards
  const summary = sortedData[0] || { totalSales: 0, totalOrders: 0, byService: {} };
  const allServices = Array.from(new Set(sortedData.flatMap(d => Object.keys(d.byService))));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Total revenue for the most recent {periodName.toLowerCase().slice(0, -1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total orders for the most recent {periodName.toLowerCase().slice(0, -1)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{periodName} Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatXAxis} />
              <YAxis tickFormatter={(value) => `₱${value / 1000}k`} />
              <Tooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="totalSales" fill="var(--color-totalSales)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Sales Breakdown by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allServices.map(service => {
                 const totalOrders = sortedData.reduce((sum, d) => sum + (d.byService[service]?.orders || 0), 0);
                 const totalSales = sortedData.reduce((sum, d) => sum + (d.byService[service]?.sales || 0), 0);

                 if (totalOrders === 0 && totalSales === 0) return null;

                 return (
                    <TableRow key={service}>
                        <TableCell className="font-medium flex items-center gap-2">
                            {serviceIcons[service] || <Package className="h-4 w-4 text-muted-foreground" />}
                            {service}
                        </TableCell>
                        <TableCell className="text-right">{totalOrders.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₱{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                 );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};


export default function SalesAnalytics() {
  const [reports, setReports] = useState<AllReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const reportsRef = ref(db, 'salesReports');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      if (snapshot.exists()) {
        setReports(snapshot.val());
      } else {
        setReports(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[120px]" />
                <Skeleton className="h-[120px]" />
            </div>
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[200px]" />
        </div>
    );
  }

  if (!reports) {
     return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">No Sales Data Found</h2>
        <p className="text-muted-foreground mt-2">Process some orders to see sales reports here.</p>
      </div>
    );
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
      <TabsContent value="daily">
        <ReportView data={reports.daily} periodName="Daily" />
      </TabsContent>
      <TabsContent value="weekly">
        <ReportView data={reports.weekly} periodName="Weekly" />
      </TabsContent>
      <TabsContent value="monthly">
        <ReportView data={reports.monthly} periodName="Monthly" />
      </TabsContent>
      <TabsContent value="yearly">
         <ReportView data={reports.yearly} periodName="Yearly" />
      </TabsContent>
      <TabsContent value="overall">
        <ReportView data={reports.overall} periodName="Overall" />
      </TabsContent>
    </Tabs>
  );
}
