'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';

import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { processOrder } from '@/lib/data';
import { processOrderAction } from '@/lib/actions';

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

export default function PosCheckout() {
  const { cartItems, cartTotal, clearCart, cartCustomer, setCartCustomer, setCartOpen } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const { user, activeStoreId } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('unknown');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [discount, setDiscount] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [applyBalance, setApplyBalance] = useState(false);
  const [isSubmitting, startTransition] = useTransition();

  useEffect(() => {
    if (!activeStoreId) return;
    const customersRef = ref(db, `storeData/${activeStoreId}/customers`);
    const unsubscribe = onValue(customersRef, (snapshot) => {
      try {
        const fetchedCustomers = snapshotToArray<Customer>(snapshot);
        setCustomers(fetchedCustomers);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch customers.' });
      }
    });

    return () => unsubscribe();
  }, [activeStoreId, toast]);

  useEffect(() => {
    if (cartCustomer && customers.length > 0) {
      const customerInList = customers.find(c => c.name === cartCustomer.name);
      if (customerInList) {
        setSelectedCustomerId(customerInList.id);
      }
    }
  }, [cartCustomer, customers]);

  const customerOptions = useMemo(() => {
    return [{ value: 'unknown', label: 'Unknown Customer' }, ...customers.map(c => ({ value: c.id, label: c.name }))];
  }, [customers]);
  
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const handleCustomerSelect = (customerId: string) => {
    const selected = customers.find(c => c.id === customerId);
    setSelectedCustomerId(customerId);
    setApplyBalance(false);
    if (selected) {
      setCartCustomer({ name: selected.name });
    } else {
      setCartCustomer({ name: 'Unknown Customer' });
    }
  };
  
  const handleAddNewCustomerSuccess = (newCustomer: Customer) => {
    setIsCustomerDialogOpen(false);
    setSelectedCustomerId(newCustomer.id);
    setCartCustomer({ name: newCustomer.name });
    toast({ title: "Customer added", description: `"${newCustomer.name}" is now selected for the order.` });
  };

  const discountValue = parseFloat(discount) || 0;
  const customerBalanceToApply = applyBalance && selectedCustomer ? selectedCustomer.balance : 0;
  
  const finalTotal = cartTotal - discountValue - customerBalanceToApply;

  const amountTenderedValue = parseFloat(amountTendered) || 0;
  const balanceOrChange = finalTotal - amountTenderedValue;

  const handleProcessOrder = (settlementType: 'pay_order' | 'add_to_balance') => {
    if (!selectedCustomerId) {
      toast({ variant: 'destructive', title: 'Customer Needed', description: 'Please select a customer.' });
      return;
    }

    if (!user || !activeStoreId) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in and have a store selected.' });
        return;
    }

    const isUnknownCustomer = selectedCustomerId === 'unknown';
    const customerForAction = isUnknownCustomer
      ? { id: 'unknown', name: 'Unknown Customer', balance: 0 }
      : selectedCustomer;
    
    if (!customerForAction) {
        toast({ variant: 'destructive', title: 'Customer Error', description: 'Selected customer could not be found.' });
        return;
    }

    startTransition(async () => {
      try {
        
        const orderPayload = {
          customerId: customerForAction.id,
          customerName: customerForAction.name,
          items: cartItems,
          subtotal: cartTotal,
          discount: discountValue,
          total: finalTotal,
          amountTendered: amountTenderedValue,
          applyCustomerBalance: isUnknownCustomer ? false : applyBalance,
          initialCustomerBalance: customerForAction.balance,
          settlementType,
        };

        await processOrder(activeStoreId, orderPayload, { userId: user.uid, userName: user.displayName || user.email! });
        await processOrderAction();

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
    
    if (finalTotal >= 0 && amountTenderedValue < finalTotal) {
       toast({ variant: 'destructive', title: 'Insufficient Payment', description: 'Amount tendered must be greater than or equal to the total.' });
       return;
    }
    handleProcessOrder('pay_order');
  };
  
  if (cartItems.length === 0) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Order</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-6">
                <p className="text-muted-foreground mt-2">Your order is empty.</p>
                <Button variant="link" onClick={() => setCartOpen(true)}>View Cart Details</Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Order & Checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
         <ScrollArea className="h-[200px] pr-4">
            {cartItems.map(item => {
              const isPrinting = item.category === 'Printing';
              const isCashIO = item.category === 'CashIO';
              const isEloading = item.category === 'E-loading';
              const isOtherService = item.category === 'Other Service';
              return (
              <div key={item.id} className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                  <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                      <Image src={item.image || 'https://placehold.co/64x64.png'} alt={item.name} fill sizes="64px" className="object-cover" data-ai-hint={isPrinting ? 'printing service' : isCashIO ? 'transaction' : isEloading ? 'loading service' : isOtherService ? 'service icon' : 'product photo'} />
                  </div>
                  <div className="flex-1">
                      <p className="font-medium text-sm leading-tight">{item.name}</p>
                      {!isCashIO && <p className="text-xs text-muted-foreground">Qty: {item.quantity}{item.unit === 'kg' ? ' kg' : ''}</p>}
                  </div>
                  </div>
                  <p className="font-medium text-sm">₱{(item.price * item.quantity).toFixed(2)}</p>
              </div>
              )})}
        </ScrollArea>

        <Separator />

        <div className="space-y-2 text-sm">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₱{cartTotal.toFixed(2)}</span>
            </div>
        </div>

        <Separator />
        
        <div className="space-y-2">
            <Label>Customer</Label>
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
            {selectedCustomer && selectedCustomer.balance !== 0 && (
              <div className="flex items-center justify-between rounded-lg border p-2 mt-2">
                  <div>
                      <Label htmlFor='apply-balance' className="text-xs">Apply Customer Balance</Label>
                      <p className="text-xs text-muted-foreground">
                         Use their <span className={cn("font-medium", selectedCustomer.balance > 0 ? "text-green-600" : "text-destructive")}>₱{selectedCustomer.balance.toFixed(2)}</span> balance.
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
        </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (₱)</Label>
              <Input
                id="discount"
                type="number"
                placeholder="0.00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="h-9"
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
                className="h-9"
              />
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
             <div className="flex justify-between font-semibold text-base pt-2">
                <span className="text-foreground">Total</span>
                <span>₱{finalTotal.toFixed(2)}</span>
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full" disabled={isSubmitting || !selectedCustomerId}>
              {isSubmitting ? 'Processing...' : 'Pay Order'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to process a payment of ₱{amountTenderedValue.toFixed(2)} for a total of ₱{finalTotal.toFixed(2)}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePayOrder} disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Confirm Payment'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {balanceOrChange !== 0 && (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button 
                        variant="secondary" 
                        className="w-full" 
                        disabled={isSubmitting || !selectedCustomerId || selectedCustomerId === 'unknown'}
                    >
                        {`Add to Balance (₱${balanceOrChange.toFixed(2)})`}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Balance Update</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will add ₱{balanceOrChange.toFixed(2)} to {selectedCustomer?.name}'s balance. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleProcessOrder('add_to_balance')} disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </CardFooter>
    </Card>

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
  </>
  );
}
