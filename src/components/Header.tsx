'use client';

import Link from 'next/link';
import { ShoppingBag, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { CartSheet } from '@/components/CartSheet';
import { useState } from 'react';

export default function Header() {
  const { cartCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <Warehouse className="h-7 w-7 text-primary" />
                <span className="font-bold text-xl text-foreground">Caj-Store</span>
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  Store
                </Link>
                <Link href="/printing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  Printing
                </Link>
                <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  Admin
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)} className="relative">
                <ShoppingBag className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
                <span className="sr-only">Open cart</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
