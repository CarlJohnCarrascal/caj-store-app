'use client';

import { useCart } from '@/hooks/use-cart';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function PosCheckout() {
  const { cartItems, cartTotal } = useCart();
  const discount = 0; // Placeholder
  const vat = 0; // Placeholder
  const total = cartTotal - discount + vat;

  return (
    <aside className="bg-card rounded-lg flex flex-col p-6">
      <h2 className="text-2xl font-bold mb-6">Shopping Cart</h2>
      <ScrollArea className="flex-grow pr-4 -mr-4 mb-6">
        <div className="space-y-4">
          {cartItems.length > 0 ? (
            cartItems.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 relative bg-white rounded-md p-1">
                     <Image src={item.image || 'https://placehold.co/40x40.png'} alt={item.name} fill sizes="40px" className="object-contain" />
                  </div>
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                <div className="font-mono text-sm">
                  {item.quantity} x ₱{item.price.toFixed(2)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center">Cart is empty</p>
          )}
        </div>
      </ScrollArea>
      <div className="flex-shrink-0 space-y-3">
        <Separator />
        <div className="flex justify-between font-medium">
          <span>Subtotal:</span>
          <span className="font-mono">₱{cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium text-muted-foreground">
          <span>Discount:</span>
          <span className="font-mono">₱{discount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium text-muted-foreground">
          <span>VAT:</span>
          <span className="font-mono">₱{vat.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-xl font-bold">
          <span>Total:</span>
          <span className="font-mono">₱{total.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="space-y-2 pt-4">
            <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="h-12">Cash</Button>
                <Button variant="outline" className="h-12">GCash</Button>
                <Button variant="outline" className="h-12">Card</Button>
            </div>
             <Button className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600 text-white">
                CHECKOUT
             </Button>
        </div>
      </div>
    </aside>
  );
}
