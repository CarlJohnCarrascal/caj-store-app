'use client';

import { useCart } from '@/hooks/use-cart';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createOrderAction } from '@/lib/actions';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

const checkoutSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  address: z.string().min(5, { message: 'Address must be at least 5 characters.' }),
  city: z.string().min(2, { message: 'City must be at least 2 characters.' }),
  zip: z.string().min(5, { message: 'ZIP code must be at least 5 characters.' }),
});

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: '',
      email: '',
      address: '',
      city: '',
      zip: '',
    },
  });

  async function onSubmit(values: z.infer<typeof checkoutSchema>) {
    try {
      await createOrderAction({
        customer: values,
        items: cartItems,
        total: cartTotal,
      });
      toast({
        title: 'Order Placed!',
        description: 'Thank you for your purchase.',
      });
      clearCart();
      router.push('/order-confirmation');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Order Failed',
        description: 'There was a problem placing your order. Please try again.',
      });
    }
  }

  if (cartItems.length === 0) {
    return (
        <div className="text-center">
            <h1 className="text-2xl font-semibold">Your cart is empty</h1>
            <p className="text-muted-foreground mt-2">Add some products to your cart to proceed to checkout.</p>
            <Button asChild className="mt-4"><a href="/">Go to Store</a></Button>
        </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-12">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Anytown" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Placing Order...' : `Place Order (₱${cartTotal.toFixed(2)})`}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Order Summary</h2>
        <Card>
          <CardContent className="p-4 space-y-4">
            {cartItems.map(item => {
              const isPrinting = item.category === 'Printing';
              return (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                    <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" data-ai-hint={isPrinting ? 'printing service' : 'product photo'} />
                  </div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}{item.unit === 'kg' ? ' kg' : ''}</p>
                    {isPrinting && item.description && (
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
                <p className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            )})}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <p>Total</p>
              <p>₱{cartTotal.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
