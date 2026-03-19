
'use client';

import { useCart } from '@/hooks/use-cart';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, ArrowRight, PanelLeftOpen, PanelRightClose, ShoppingCart } from 'lucide-react';

interface PosCheckoutProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function PosCheckout({ isCollapsed, onToggleCollapse }: PosCheckoutProps) {
  const { cartItems, cartTotal, cartCount, removeFromCart, updateQuantity } = useCart();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleItemClick = (itemId: string) => {
    setSelectedItemId(prevId => (prevId === itemId ? null : itemId));
  };
  
  if (isCollapsed) {
    return (
      <aside className="bg-card rounded-lg flex flex-col p-4 items-center justify-start gap-4">
        <Button onClick={onToggleCollapse} variant="ghost" size="icon">
          <PanelLeftOpen className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center gap-2 mt-4">
            <span className="text-xl font-bold">{cartCount}</span>
            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
        </div>
      </aside>
    );
  }

  const discount = 0; // Placeholder
  const vat = 0; // Placeholder
  const total = cartTotal - discount + vat;

  return (
    <aside className="bg-card rounded-lg flex flex-col p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Shopping Cart ({cartCount})</h2>
         <Button onClick={onToggleCollapse} variant="ghost" size="icon">
          <PanelRightClose className="h-6 w-6" />
        </Button>
      </div>
      <ScrollArea className="flex-grow pr-4 -mr-4 mb-6">
        <div className="divide-y divide-border -my-2">
          {cartItems.length > 0 ? (
            cartItems.map(item => {
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
                    className={cn(
                        'py-4 space-y-2 cursor-pointer transition-colors',
                        isSelected && 'bg-muted/50'
                    )}
                    onClick={() => handleItemClick(item.id)}
                    >
                    <div className="flex items-center space-x-4">
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
                           <Image 
                             src={item.image || 'https://placehold.co/64x64.png'} 
                             alt={item.name} 
                             fill sizes="64px" 
                             className="object-cover" 
                             data-ai-hint={
                              isPrinting
                                ? 'printing service'
                                : isCashIO
                                ? 'transaction'
                                : isEloading
                                ? 'loading service'
                                : isOtherService
                                ? 'service icon'
                                : 'product photo'
                            }
                           />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between font-semibold">
                              <h3 className="flex-1 pr-2">{item.name}</h3>
                              <p className="pl-4">₱{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                            {!(isCashIO) && (
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} x ₱{item.price.toFixed(2)}
                                {isKg ? ' / kg' : ''}
                              </p>
                            )}
                             {(isPrinting || isCashIO || isEloading || isOtherService) && item.description && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] break-words">{item.description}</p>
                            )}
                        </div>
                    </div>

                    {isSelected && (
                        <div className="flex items-center justify-between pl-20 pt-2">
                           {!(isCashIO) ? (
                                <div className="flex items-center">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={e => {
                                    e.stopPropagation();
                                    const newQuantity = Math.max(
                                        min,
                                        parseFloat((item.quantity - step).toPrecision(10))
                                    );
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
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => {
                                    e.stopPropagation();
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                        updateQuantity(item.id, val);
                                    }
                                    }}
                                    onBlur={e => {
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
                                    onClick={e => {
                                    e.stopPropagation();
                                    const newQuantity = parseFloat(
                                        (item.quantity + step).toPrecision(10)
                                    );
                                    updateQuantity(item.id, newQuantity);
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                                </div>
                            ) : (
                                <div />
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={e => {
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
            })
          ) : (
            <p className="text-muted-foreground text-center py-16">Cart is empty</p>
          )}
        </div>
      </ScrollArea>
      
      {cartItems.length > 0 && (
      <div className="flex-shrink-0 space-y-3 border-t pt-4">
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
             <Button asChild className="w-full h-14 text-lg">
                <Link href="/pos/checkout">
                  CHECKOUT <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
             </Button>
        </div>
      </div>
      )}
    </aside>
  );
}
