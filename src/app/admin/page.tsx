
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Printer, Store, ArrowRightLeft, Landmark, Users, Library, History, Smartphone, Wrench, ShoppingCart, Receipt, BarChart, LogOut, User as UserIcon, DollarSign, Settings } from 'lucide-react';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
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
              <CardTitle className="text-lg font-medium">E-loading Service</CardTitle>
              <Smartphone className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                  Process e-loading transactions for sims, TV, and more.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/e-loading">Go to E-loading</Link>
               </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Other Services</CardTitle>
              <Wrench className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                  Handle miscellaneous services and transactions.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/other-services">Go to Services</Link>
               </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Expenses</CardTitle>
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                  Track and manage business expenses and spending.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/expenses">Manage Expenses</Link>
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Management & Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
              <CardTitle className="text-lg font-medium">Printing Prices</CardTitle>
              <Printer className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Set and manage prices for your various printing services.
              </CardDescription>
              <Button asChild className="w-full mt-4">
                  <Link href="/admin/printing/prices">Manage Prices</Link>
              </Button>
            </CardContent>
          </Card>
           <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">CashIO Fees</CardTitle>
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Configure the fee calculation for CashIO services.
              </CardDescription>
              <Button asChild className="w-full mt-4">
                  <Link href="/admin/cashio-fees">Manage Fees</Link>
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
           <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Collections</CardTitle>
              <Library className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track and manage customer payments and collections.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/collections">Manage Collections</Link>
               </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Orders</CardTitle>
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                View a log of all processed orders from the POS.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/orders">View Orders</Link>
               </Button>
            </CardContent>
          </Card>
           <Card className="hover:shadow-lg transition-shadow col-span-1 md:col-span-2 lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Reports</CardTitle>
              <BarChart className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                View detailed reports on sales, products, customers, and more.
              </CardDescription>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mt-4">
                <Button asChild variant="secondary"><Link href="/admin/reports/sales">Sales</Link></Button>
                <Button asChild variant="secondary"><Link href="/admin/reports/product">Product</Link></Button>
                <Button asChild variant="secondary"><Link href="/admin/reports/customer">Customer</Link></Button>
                <Button asChild variant="secondary"><Link href="/admin/reports/cashio">Cash IO</Link></Button>
                <Button asChild variant="secondary"><Link href="/admin/reports/e-loading">E-loading</Link></Button>
                <Button asChild variant="secondary"><Link href="/admin/reports/printing">Printing</Link></Button>
                <Button asChild variant="secondary"><Link href="/admin/reports/other-service">Other</Link></Button>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Activity Logs</CardTitle>
              <History className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                View a log of all activities and changes.
              </CardDescription>
               <Button asChild className="w-full mt-4">
                  <Link href="/admin/activity-logs">View Activity</Link>
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
