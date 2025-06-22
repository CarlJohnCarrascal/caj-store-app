import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Printer, Store, ArrowRightLeft, Landmark, Users } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">Manage your store, services, and products from here.</p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Point of Sale</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">POS Store</CardTitle>
              <Store className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access the customer-facing store to create new orders.
              </CardDescription>
              <Button asChild className="w-full mt-4">
                  <Link href="/admin/store">Go to Store</Link>
              </Button>
            </CardContent>
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
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/printing">Go to Printing</Link>
               </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Cash IO</CardTitle>
              <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage cash in/out transactions for external payments.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/cashio">Manage Transactions</Link>
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Management</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Products</CardTitle>
              <Package className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Add, edit, or remove products from your inventory.
              </CardDescription>
              <Button asChild className="w-full mt-4">
                  <Link href="/admin/products">Manage Products</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Accounts</CardTitle>
              <Landmark className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                  Manage your business's financial accounts.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/accounts">Manage Accounts</Link>
               </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Customers</CardTitle>
              <Users className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                View and manage your customer information.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/customers">Manage Customers</Link>
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
