'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus } from 'lucide-react';
import Link from 'next/link';

import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { getCustomers } from '@/lib/data';
import { createOrderAction, createOrderAndUpdateBalanceAction } from '@/lib/actions';
import { Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import CustomerForm from '@/app/admin/customers/components/CustomerForm';

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart, cartCustomer, setCartCustomer } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [discount, setDiscount] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [isSubmittingPayment, startPaymentTransition] = useTransition();
  const [isSubmittingBalance, startBalanceTransition] = useTransition();

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const fetchedCustomers = await getCustomers();
        setCustomers(fetchedCustomers);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch customers.' });
      }
    }
    fetchCustomers();
  }, [toast]);

  useEffect(() => {
    if (cartCustomer && customers.length > 0) {
      const customerInList = customers.find(c => c.name === cartCustomer.name);
      if (customerInList) {
        setSelectedCustomerId(customerInList.id);
      }
    }
  }, [cartCustomer, customers]);

  const customerOptions = useMemo(() => {
    return customers.map(c => ({ value: c.id, label: c.name }));
  }, [customers]);

  const handleCustomerSelect = (customerId: string) => {
    const selected = customers.find(c => c.id === customerId);
    setSelectedCustomerId(customerId);
    if (selected) {
      setCartCustomer({ name: selected.name });
    }
  };
  
  const handleAddNewCustomerSuccess = async () => {
    setIsCustomerDialogOpen(false);
    const updatedCustomers = await getCustomers();
    setCustomers(updatedCustomers);
    toast({ title: "Customer added", description: "You can now select the new customer." });
  };

  const discountValue = parseFloat(discount) || 0;
  const finalTotal = Math.max(0, cartTotal - discountValue);
  const amountTenderedValue = parseFloat(amountTendered) || 0;
  const balanceOrChange = finalTotal - amountTenderedValue;

  async function handlePayOrder() {
    if (!selectedCustomerId) {
      toast({ variant: 'destructive', title: 'Customer Needed', description: 'Please select or add a customer.' });
      return;
    }
    
    if (balanceOrChange !== 0) {
        toast({ variant: 'destructive', title: 'Incorrect Payment', description: 'Amount tendered must equal the total. For other amounts, use "Add to Balance".' });
        return;
    }

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    if (!selectedCustomer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected customer not found.' });
        return;
    }

    startPaymentTransition(async () => {
      try {
        await createOrderAction({
          customerId: selectedCustomerId,
          customerName: selectedCustomer.name,
          items: cartItems,
          subtotal: cartTotal,
          discount: discountValue,
          total: finalTotal,
        });
        toast({
          title: 'Order Placed!',
          description: 'Thank you for your purchase.',
        });
        clearCart();
        router.push('/admin/order-confirmation');
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Order Failed',
          description: 'There was a problem placing your order. Please try again.',
        });
      }
    });
  }
  
  async function handleAddToBalance() {
    if (!selectedCustomerId) {
      toast({ variant: 'destructive', title: 'Customer Needed', description: 'Please select or add a customer.' });
      return;
    }
    
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    if (!selectedCustomer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected customer not found.' });
        return;
    }

    startBalanceTransition(async () => {
      try {
        await createOrderAndUpdateBalanceAction({
          customerId: selectedCustomerId,
          customerName: selectedCustomer.name,
          items: cartItems,
          subtotal: cartTotal,
          discount: discountValue,
          total: finalTotal,
          balanceChange: balanceOrChange
        });
        toast({
          title: 'Order Placed & Balance Updated!',
          description: `Customer balance has been updated by ₱${balanceOrChange.toFixed(2)}.`,
        });
        clearCart();
        router.push('/admin/order-confirmation');
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Operation Failed',
          description: 'There was a problem processing the order and updating balance.',
        });
      }
    });
  }


  if (cartItems.length === 0 && !isSubmittingPayment && !isSubmittingBalance) {
    return (
        <div className="text-center">
            <h1 className="text-2xl font-semibold">Your order is empty</h1>
            <p className="text-muted-foreground mt-2">Add some products to your order to proceed.</p>
            <Button asChild className="mt-4"><Link href="/admin/store">Go to Store</Link></Button>
        </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
            <CardDescription>Select a customer for this order or add a new one.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex gap-2 items-start">
                <div className="flex-grow">
                    <Combobox
                      options={customerOptions}
                      value={selectedCustomerId}
                      onChange={handleCustomerSelect}
                      placeholder="Select a customer"
                      searchPlaceholder="Search customers..."
                      emptyPlaceholder="No customer found."
                    />
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => setIsCustomerDialogOpen(true)}>
                    <UserPlus className="h-4 w-4" />
                    <span className="sr-only">Add New Customer</span>
                </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (₱)</Label>
              <Input
                id="discount"
                type="number"
                placeholder="0.00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="amountTendered">Amount Tendered (₱)</Label>
              <Input
                id="amountTendered"
                type="number"
                placeholder="0.00"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <ScrollArea className="h-[300px] pr-4">
                {cartItems.map(item => {
                const isPrinting = item.category === 'Printing';
                const isCashIO = item.category === 'CashIO';
                return (
                <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                    <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                        <Image src={item.image || 'https://placehold.co/64x64.png'} alt={item.name} fill sizes="64px" className="object-cover" data-ai-hint={isPrinting ? 'printing service' : isCashIO ? 'transaction' : 'product photo'} />
                    </div>
                    <div>
                        <p className="font-medium">{item.name}</p>
                        {!isCashIO && <p className="text-sm text-muted-foreground">Qty: {item.quantity}{item.unit === 'kg' ? ' kg' : ''}</p>}
                        {(isPrinting || isCashIO) && item.description && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[180px] break-words">{item.description}</p>
                        )}
                    </div>
                    </div>
                    <p className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</p>
                </div>
                )})}
            </ScrollArea>
            <Separator />
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₱{cartTotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className={cn(discountValue > 0 && "text-green-600")}>- ₱{discountValue.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-semibold text-base">
                    <span className="text-foreground">Total</span>
                    <span>₱{finalTotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Tendered</span>
                    <span>₱{amountTenderedValue.toFixed(2)}</span>
                </div>
                 {balanceOrChange <= 0 ? (
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Change Due</span>
                      <span>₱{(-balanceOrChange).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between font-semibold text-base text-destructive">
                      <span>Balance Due</span>
                      <span>₱{balanceOrChange.toFixed(2)}</span>
                  </div>
                )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={handlePayOrder} disabled={isSubmittingPayment || isSubmittingBalance || !selectedCustomerId}>
              {isSubmittingPayment ? 'Processing Payment...' : 'Pay Order'}
            </Button>
            {balanceOrChange !== 0 && (
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={handleAddToBalance} 
                disabled={isSubmittingPayment || isSubmittingBalance || !selectedCustomerId}
              >
                {isSubmittingBalance ? 'Adding to Balance...' : `Add to Balance (₱${balanceOrChange.toFixed(2)})`}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

       <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                    Add a new customer to your records. They will be available to select after creation.
                </DialogDescription>
            </DialogHeader>
            <CustomerForm
                onSuccess={handleAddNewCustomerSuccess}
                onCancel={() => setIsCustomerDialogOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}
