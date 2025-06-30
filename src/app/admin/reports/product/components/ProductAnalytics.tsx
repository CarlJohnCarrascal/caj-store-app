
'use client';

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Package, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import { Product, ProductReportData } from '@/lib/types';
import { getReportPaths } from '@/lib/utils';
import Image from 'next/image';

// Types for Product Reports
type ReportPeriodData = {
    [productId: string]: ProductReportData;
};

type AllReports = {
    daily?: { [dateKey: string]: ReportPeriodData };
    weekly?: { [dateKey: string]: ReportPeriodData };
    monthly?: { [dateKey: string]: ReportPeriodData };
    yearly?: { [dateKey: string]: ReportPeriodData };
    overall?: { [dateKey: string]: ReportPeriodData };
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

const ReportView = ({ data, periodName, productMap }: { data?: ReportPeriodData; periodName: string; productMap: Map<string, Product> }) => {
    
    const summary = useMemo(() => {
        if (!data) return { totalSales: 0, totalQuantity: 0, totalOrders: 0 };
        return Object.values(data).reduce((acc, product) => {
            acc.totalSales += product.totalSales || 0;
            acc.totalQuantity += product.totalQuantity || 0;
            acc.totalOrders += product.totalOrders || 0;
            return acc;
        }, { totalSales: 0, totalQuantity: 0, totalOrders: 0 });
    }, [data]);
    
    const topProductsBySales = useMemo(() => {
        if (!data) return [];
        return Object.entries(data)
            .map(([productId, stats]) => ({
                product: productMap.get(productId),
                ...stats,
            }))
            .filter(item => item.product) // Filter out products not found in the map
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 10); // Top 10
    }, [data, productMap]);

    if (!data) {
        return <div className="text-center py-16"><p className="text-lg text-muted-foreground">No product data available for this period.</p></div>;
    }
    
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalQuantity.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalOrders.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>By sales value for the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Product</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Quantity Sold</TableHead>
                                <TableHead className="text-right">Total Sales</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topProductsBySales.map(item => (
                                <TableRow key={item.product!.id}>
                                    <TableCell>
                                        <div className="relative h-12 w-12 rounded-md overflow-hidden">
                                            <Image src={item.product!.image || 'https://placehold.co/48x48.png'} alt={item.product!.name} fill sizes="48px" className="object-cover" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.product!.name}</TableCell>
                                    <TableCell className="text-right">{item.totalQuantity.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">₱{item.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};


export default function ProductAnalytics() {
    const [reports, setReports] = useState<AllReports | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    useEffect(() => {
        let reportsLoaded = false;
        let productsLoaded = false;

        const checkLoading = () => {
            if(reportsLoaded && productsLoaded) setIsLoading(false);
        }

        const reportsRef = ref(db, 'productReports');
        const unsubscribeReports = onValue(reportsRef, (snapshot) => {
            setReports(snapshot.exists() ? snapshot.val() : null);
            reportsLoaded = true;
            checkLoading();
        });

        const productsRef = ref(db, 'products');
        const unsubscribeProducts = onValue(productsRef, (snapshot) => {
            setProducts(snapshotToArray<Product>(snapshot));
            productsLoaded = true;
            checkLoading();
        });

        return () => {
            unsubscribeReports();
            unsubscribeProducts();
        }
    }, []);

    const aggregateReportData = (periodData?: { [dateKey: string]: ReportPeriodData }): ReportPeriodData | undefined => {
        if (!periodData) return undefined;

        const aggregated: ReportPeriodData = {};
        Object.values(periodData).forEach(dateEntry => {
            Object.entries(dateEntry).forEach(([productId, stats]) => {
                if (!aggregated[productId]) {
                    aggregated[productId] = { totalQuantity: 0, totalSales: 0, totalOrders: 0 };
                }
                aggregated[productId].totalQuantity += stats.totalQuantity || 0;
                aggregated[productId].totalSales += stats.totalSales || 0;
                aggregated[productId].totalOrders += stats.totalOrders || 0;
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
                const entryDate = new Date(key);
                return entryDate >= thirtyDaysAgo;
            } catch (e) {
                return false;
            }
        });
        
        if (last30DaysEntries.length === 0) return undefined;
        return aggregateReportData(Object.fromEntries(last30DaysEntries));
    }, [reports]);

    const weeklyData = useMemo(() => aggregateReportData(reports?.weekly), [reports]);
    const monthlyData = useMemo(() => aggregateReportData(reports?.monthly), [reports]);
    const yearlyData = useMemo(() => aggregateReportData(reports?.yearly), [reports]);
    const overallData = useMemo(() => aggregateReportData(reports?.overall), [reports]);

    if (isLoading) {
        return <div className="space-y-6"><Skeleton className="h-[120px]" /><Skeleton className="h-[300px]" /><Skeleton className="h-[200px]" /></div>;
    }
    
    if (!reports) {
        return <div className="text-center py-16"><h2 className="text-xl font-semibold">No Product Data Found</h2><p className="text-muted-foreground mt-2">Process some orders with products to see reports here.</p></div>;
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
            <TabsContent value="today"><ReportView data={todayData} periodName="Today" productMap={productMap} /></TabsContent>
            <TabsContent value="daily"><ReportView data={last30DaysData} periodName="Last 30 Days" productMap={productMap} /></TabsContent>
            <TabsContent value="weekly"><ReportView data={weeklyData} periodName="Weekly" productMap={productMap} /></TabsContent>
            <TabsContent value="monthly"><ReportView data={monthlyData} periodName="Monthly" productMap={productMap} /></TabsContent>
            <TabsContent value="yearly"><ReportView data={yearlyData} periodName="Yearly" productMap={productMap} /></TabsContent>
            <TabsContent value="overall"><ReportView data={overallData} periodName="Overall" productMap={productMap} /></TabsContent>
        </Tabs>
    );
}
