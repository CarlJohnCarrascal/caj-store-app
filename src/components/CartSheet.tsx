'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="px-6">
          <SheetTitle>Shopping Cart ({cartCount})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {cartItems.length > 0 ? (
            <ScrollArea className="h-full pr-6">
              <div className="divide-y divide-border">
                {cartItems.map(item => {
                  const isKg = item.unit === 'kg';
                  const isPrinting = item.category === 'Printing';
                  const step = isKg ? 0.01 : 1;
                  const min = isKg ? 0.01 : 1;
                  
                  return (
                    <div key={item.id} className="flex items-center py-4 space-x-4">
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                          data-ai-hint={isPrinting ? 'printing service' : 'product photo'}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">₱{item.price.toFixed(2)}{isKg ? ' / kg' : ''}</p>
                        {isPrinting && item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const newQuantity = Math.max(0, parseFloat((item.quantity - step).toPrecision(10)));
                              updateQuantity(item.id, newQuantity);
                            }}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            step={step}
                            min={min}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updateQuantity(item.id, isNaN(val) || val < 0 ? 0 : val)
                            }}
                            className="h-7 w-16 text-center mx-2"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const newQuantity = parseFloat((item.quantity + step).toPrecision(10));
                              updateQuantity(item.id, newQuantity);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full flex-col items-center justify-center space-y-2 px-6">
              <p className="text-lg text-muted-foreground">Your cart is empty</p>
              <SheetClose asChild>
                <Button variant="outline" asChild>
                  <Link href="/">Start Shopping</Link>
                </Button>
              </SheetClose>
            </div>
          )}
        </div>
        {cartItems.length > 0 && (
          <SheetFooter className="bg-background border-t p-6 sm:flex-col sm:space-x-0 space-y-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>₱{cartTotal.toFixed(2)}</span>
            </div>
            <SheetClose asChild>
              <Button asChild className="w-full">
                <Link href="/checkout">
                  Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
