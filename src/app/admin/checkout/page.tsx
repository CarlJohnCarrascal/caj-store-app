'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus } from 'lucide-react';
import Link from 'next/link';

import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { getCustomers } from '@/lib/data';
import { processOrderAction } from '@/lib/actions';
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
import { Switch } from '@/components/ui/switch';

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart, cartCustomer, setCartCustomer } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [discount, setDiscount] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [applyBalance, setApplyBalance] = useState(false);
  const [isSubmitting, startTransition] = useTransition();

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
  
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const handleCustomerSelect = (customerId: string) => {
    const selected = customers.find(c => c.id === customerId);
    setSelectedCustomerId(customerId);
    setApplyBalance(false); // Reset when customer changes
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
  const customerBalanceToApply = applyBalance && selectedCustomer ? selectedCustomer.balance : 0;
  
  // Correction: finalTotal can be negative
  const finalTotal = cartTotal - discountValue - customerBalanceToApply;

  const amountTenderedValue = parseFloat(amountTendered) || 0;
  const balanceOrChange = finalTotal - amountTenderedValue;

  const processOrder = () => {
    if (!selectedCustomerId || !selectedCustomer) {
      toast({ variant: 'destructive', title: 'Customer Needed', description: 'Please select or add a customer.' });
      return;
    }

    startTransition(async () => {
      try {
        await processOrderAction({
          customerId: selectedCustomerId,
          customerName: selectedCustomer.name,
          items: cartItems,
          subtotal: cartTotal,
          discount: discountValue,
          total: finalTotal,
          amountTendered: amountTenderedValue,
          applyCustomerBalance: applyBalance,
          initialCustomerBalance: selectedCustomer.balance,
        });

        toast({
          title: 'Order Processed!',
          description: 'The order has been created and customer balance updated if applicable.',
        });
        clearCart();
        router.push('/admin/order-confirmation');
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Operation Failed',
          description: error.message || 'There was a problem processing the order.',
        });
      }
    });
  };

  const handlePayOrder = () => {
    if (finalTotal < 0 && amountTenderedValue !== 0) {
      toast({
        variant: 'destructive',
        title: 'Incorrect Payment',
        description: 'Amount tendered must be zero when the total is negative.',
      });
      return;
    }
    
    if (finalTotal >= 0 && balanceOrChange !== 0) {
      toast({ variant: 'destructive', title: 'Incorrect Payment', description: 'Amount tendered must equal the total. For other amounts, use "Add to Balance".' });
      return;
    }
    processOrder();
  };

  if (cartItems.length === 0 && !isSubmitting) {
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
            {selectedCustomer && (
                <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">
                        Selected customer: <span className="font-semibold text-foreground">{selectedCustomer.name}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Current balance: 
                        <span className={cn("font-medium ml-1", selectedCustomer.balance > 0 ? "text-green-600" : selectedCustomer.balance < 0 ? "text-destructive" : "text-foreground")}>
                           ₱{selectedCustomer.balance.toFixed(2)}
                        </span>
                    </p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid sm:grid-cols-2 gap-6">
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
              </div>
              {selectedCustomer && selectedCustomer.balance !== 0 && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label htmlFor='apply-balance'>Apply Customer Balance</Label>
                        <p className="text-sm text-muted-foreground">
                           Use their <span className={cn("font-medium", selectedCustomer.balance > 0 ? "text-green-600" : "text-destructive")}>₱{selectedCustomer.balance.toFixed(2)}</span> balance in this transaction.
                        </p>
                    </div>
                    <Switch
                        id='apply-balance'
                        checked={applyBalance}
                        onCheckedChange={setApplyBalance}
                        disabled={!selectedCustomer}
                    />
                </div>
              )}
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
                {applyBalance && selectedCustomer && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Applied Balance</span>
                        <span className={cn(customerBalanceToApply > 0 ? "text-green-600" : "text-destructive")}>
                           - ₱{customerBalanceToApply.toFixed(2)}
                        </span>
                    </div>
                )}
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
            <Button className="w-full" onClick={handlePayOrder} disabled={isSubmitting || !selectedCustomerId}>
              {isSubmitting ? 'Processing Payment...' : 'Pay Order'}
            </Button>
            {balanceOrChange !== 0 && (
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={processOrder}
                disabled={isSubmitting || !selectedCustomerId}
              >
                {isSubmitting ? 'Processing...' : `Add to Balance (₱${balanceOrChange.toFixed(2)})`}
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
