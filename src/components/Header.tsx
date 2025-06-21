'use client';

import Link from 'next/link';
import { ShoppingBag, Warehouse, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { CartSheet } from '@/components/CartSheet';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
              <nav className="hidden md:flex items-center space-x-6">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus:outline-none">
                    Point of Sale
                    <ChevronDown className="relative top-[1px] ml-1 h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link href="/">Store</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/printing">Printing</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
