import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import Image from 'next/image';
import { getOrderById, getCustomerById } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AtSign, Home, Phone, User, Wallet, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id);
  if (!order) {
    notFound();
  }

  const customer = order.customerId !== 'unknown' ? await getCustomerById(order.customerId) : null;

  const change = order.amountTendered - order.total;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Order Details</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">{order.id}</p>
        </div>
        <Button asChild variant="outline">
            <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Orders
            </Link>
        </Button>
      </div>


      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Items Ordered</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Item</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                         <div className="relative h-12 w-12 rounded-md overflow-hidden">
                           <Image src={item.image || 'https://placehold.co/48x48.png'} alt={item.name} fill sizes="48px" className="object-cover" />
                         </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.name}</p>
                      </TableCell>
                      <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.quantity}{item.unit === 'kg' ? ' kg' : ''}</TableCell>
                      <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                {format(new Date(order.createdAt), 'PPpp')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
               <div className="flex justify-between">
                <span className="text-muted-foreground">Settlement Type</span>
                 <Badge variant={order.settlementType === 'pay_order' ? 'default' : 'secondary'}>
                    {order.settlementType === 'pay_order' ? 'Paid' : 'To Balance'}
                  </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₱{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>- ₱{order.discount.toFixed(2)}</span>
              </div>
              {order.applyCustomerBalance && typeof order.initialCustomerBalance === 'number' && (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Applied Balance</span>
                    <span className={cn(order.initialCustomerBalance > 0 ? "text-green-600" : "text-destructive")}>
                        - ₱{order.initialCustomerBalance.toFixed(2)}
                    </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>₱{order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Tendered</span>
                <span>₱{order.amountTendered.toFixed(2)}</span>
              </div>
              <div className={cn("flex justify-between font-medium", change < 0 ? "text-destructive" : "text-primary")}>
                <span>{change >= 0 ? 'Change' : 'Balance Due'}</span>
                <span>₱{Math.abs(change).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {customer ? (
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:underline">{customer.name}</Link>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                )}
                 <div className="flex items-start gap-3">
                    <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p>{customer.address}, {customer.location}</p>
                </div>
                <Separator />
                {typeof order.initialCustomerBalance === 'number' && typeof order.newCustomerBalance === 'number' ? (
                  <>
                    <h4 className="font-medium pt-2">Balance Change from this Order</h4>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance Before</span>
                        <span>₱{order.initialCustomerBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance After</span>
                        <span>₱{order.newCustomerBalance.toFixed(2)}</span>
                    </div>
                    <Separator />
                     <div className="flex items-center gap-3 pt-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <p>Current Balance: <span className="font-bold">₱{customer.balance.toFixed(2)}</span></p>
                    </div>
                  </>
                ) : (
                    <div className="flex items-center gap-3">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <p>Current Balance: <span className="font-bold">₱{customer.balance.toFixed(2)}</span></p>
                    </div>
                )}
              </CardContent>
            </Card>
          ) : (
             <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This was a walk-in or unknown customer.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
