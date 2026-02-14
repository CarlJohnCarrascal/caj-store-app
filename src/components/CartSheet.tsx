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
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleItemClick = (itemId: string) => {
    setSelectedItemId(prevId => prevId === itemId ? null : itemId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="px-6">
          <SheetTitle>Your Order ({cartCount} {cartCount === 1 ? 'item' : 'items'})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {cartItems.length > 0 ? (
            <ScrollArea className="h-full">
              <div className="divide-y divide-border">
                {cartItems.map(item => {
                  const isSelected = selectedItemId === item.id;
                  const isKg = item.unit === 'kg';
                  const isPrinting = item.category === 'Printing';
                  const isCashIO = item.category === 'CashIO';
                  const isEloading = item.category === 'E-loading';
                  const isOtherService = item.category === 'Other Service';
                  const step = isKg ? 0.01 : 1;
                  const min = isKg ? 0.01 : 1;
                  
                  return (
                    <div
                      key={item.id}
                      className={cn("py-4 space-y-2 cursor-pointer transition-colors", isSelected && "bg-muted/50")}
                      onClick={() => handleItemClick(item.id)}
                    >
                      <div className="flex items-center space-x-4 px-6">
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
                          <Image
                            src={item.image || 'https://placehold.co/64x64.png'}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            data-ai-hint={isPrinting ? 'printing service' : isCashIO ? 'transaction' : isEloading ? 'loading service' : isOtherService ? 'service icon' : 'product photo'}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between font-semibold">
                            <h3 className="flex-1 pr-2">{item.name}</h3>
                            <p className="pl-4">₱{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                           {!(isCashIO) && <p className="text-sm text-muted-foreground">{item.quantity} x ₱{item.price.toFixed(2)}{isKg ? ' / kg' : ''}</p>}
                          {(isPrinting || isCashIO || isEloading || isOtherService) && item.description && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] break-words">{item.description}</p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center justify-between pl-28 pr-6 pt-2">
                           {!(isCashIO) ? (
                            <div className="flex items-center">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newQuantity = Math.max(min, parseFloat((item.quantity - step).toPrecision(10)));
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
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    updateQuantity(item.id, val);
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (isNaN(val) || val < min) {
                                    updateQuantity(item.id, min);
                                  }
                                }}
                                className="h-7 w-16 text-center mx-2"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newQuantity = parseFloat((item.quantity + step).toPrecision(10));
                                  updateQuantity(item.id, newQuantity);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : <div />}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(item.id);
                            }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full flex-col items-center justify-center space-y-2 px-6">
              <p className="text-lg text-muted-foreground">Your order is empty</p>
              <SheetClose asChild>
                <Button variant="outline" asChild>
                  <Link href="/admin/store">Start Shopping</Link>
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
                <Link href="/admin/checkout">
                  Proceed to Payment <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
