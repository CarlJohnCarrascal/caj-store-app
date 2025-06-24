import { getCustomerById, getOrdersByCustomerId } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AtSign, Home, Phone, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const customer = await getCustomerById(params.id);
  
  if (!customer) {
    notFound();
  }

  const orders = await getOrdersByCustomerId(params.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{customer.name}</h1>
        <p className="text-muted-foreground">Customer Details and Order History</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
           <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="font-medium">{customer.name}</p>
              </div>
              {customer.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-start gap-3">
                  <AtSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{customer.email}</span>
                </div>
              )}
               <div className="flex items-start gap-3">
                  <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p>{customer.address}, {customer.location}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn(
                  "text-3xl font-bold",
                  customer.balance > 0 && "text-green-600",
                  customer.balance < 0 && "text-destructive"
              )}>
                ₱{customer.balance.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                A positive balance is owed to the customer. A negative balance is owed to the store.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>A list of all orders placed by {customer.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Settlement</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell>{format(new Date(order.createdAt), 'PPp')}</TableCell>
                        <TableCell className="font-medium">₱{order.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={order.settlementType === 'pay_order' ? 'default' : 'secondary'}>
                             {order.settlementType === 'pay_order' ? 'Paid' : 'To Balance'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="icon">
                             <Link href={`/admin/orders/${order.id}`}><ArrowRight className="h-4 w-4" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">This customer has not placed any orders yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
