

'use client';

import { getCustomerById, getOrdersByCustomerId } from '@/lib/data';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { AtSign, Home, Phone, User, Wallet, ArrowLeft, Pencil } from 'lucide-react';
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
import CustomerActionButtons from '../components/CustomerActionButtons';
import DeleteCustomerButton from '../components/DeleteCustomerButton';
import { Customer, Order } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CustomerForm from '../components/CustomerForm';

export default function CustomerDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchCustomerData = useCallback(async () => {
    try {
      const customerData = await getCustomerById(id);
       if (!customerData) {
        notFound();
        return;
      }
      setCustomer(customerData);
    } catch (err: any) {
      setError("Failed to load customer data. You may not have permission to view this page.");
    }
  }, [id]);

  const fetchOrdersData = useCallback(async () => {
    try {
      const ordersData = await getOrdersByCustomerId(id);
      setOrders(ordersData);
    } catch (err: any) {
       setError("Failed to load order data.");
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    async function initialFetch() {
        setIsLoading(true);
        await Promise.all([fetchCustomerData(), fetchOrdersData()]);
        setIsLoading(false);
    }
    initialFetch();
  }, [id, fetchCustomerData, fetchOrdersData]);
  
  const handleUpdateSuccess = () => {
      setIsEditModalOpen(false);
      fetchCustomerData(); // Re-fetch customer data after update
  };
  
  const handleBalanceUpdate = () => {
      fetchCustomerData(); // Re-fetch customer data after payment/balance adjustment
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <Card className="mt-4 border-destructive">
        <CardHeader><CardTitle className="text-destructive">An Error Occurred</CardTitle></CardHeader>
        <CardContent><p>{error || 'Customer not found.'}</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">{customer.name}</h1>
             <Button variant="outline" size="icon" onClick={() => setIsEditModalOpen(true)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Customer</span>
            </Button>
          </div>
          <Button asChild variant="outline">
              <Link href="/admin/customers">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Customers
              </Link>
          </Button>
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
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Balance</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
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
              <CardFooter className="flex flex-col gap-2 flex-shrink-0">
                <CustomerActionButtons customer={customer} onUpdate={handleBalanceUpdate} />
                {orders.length === 0 && (
                  <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
                )}
              </CardFooter>
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
                              <Link href={`/admin/orders/${order.id}`}><ArrowLeft className="h-4 w-4 transform rotate-180" /></Link>
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
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>
                    Update the details for {customer.name}.
                </DialogDescription>
            </DialogHeader>
            <CustomerForm
                customer={customer}
                onSuccess={handleUpdateSuccess}
                onCancel={() => setIsEditModalOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
