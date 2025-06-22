import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Printer, Store } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">Manage your store, services, and products from here.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Point of Sale</CardTitle>
            <Store className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>
              Access the customer-facing store to create new orders.
            </CardDescription>
          </CardContent>
          <div className="p-6 pt-0">
             <Button asChild className="w-full">
                <Link href="/admin/store">Go to Store</Link>
             </Button>
          </div>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Printing Services</CardTitle>
            <Printer className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>
                Configure and add custom printing jobs to an order.
            </CardDescription>
          </CardContent>
          <div className="p-6 pt-0">
             <Button asChild className="w-full">
                <Link href="/admin/printing">Go to Printing</Link>
             </Button>
          </div>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Manage Products</CardTitle>
            <Package className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>
              Add, edit, or remove products from your inventory.
            </CardDescription>
          </CardContent>
           <div className="p-6 pt-0">
             <Button asChild className="w-full">
                <Link href="/admin/products">Manage Products</Link>
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
