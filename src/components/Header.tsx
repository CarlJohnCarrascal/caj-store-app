'use client';

import Link from 'next/link';
import { ShoppingBag, Menu, Store, Printer, Package, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { CartSheet } from '@/components/CartSheet';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function Header() {
  const { cartCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              {/* Mobile Menu */}
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm">
                  <SheetHeader>
                     <SheetTitle className="text-left">
                        <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2">
                            <LayoutDashboard />
                            Dashboard
                        </Link>
                     </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-1 mt-4">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="pos" className="border-b-0">
                            <AccordionTrigger className="flex items-center gap-4 px-3 py-3 text-base font-medium rounded-md hover:bg-accent transition-colors hover:no-underline">
                                <div className="flex items-center gap-4">
                                  <Store className="h-6 w-6" />
                                  Point of Sale
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-10 space-y-1">
                                <Link
                                    href="/admin/store"
                                    className="flex items-center gap-4 px-3 py-2 text-base font-medium rounded-md hover:bg-accent transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Store className="h-5 w-5 text-muted-foreground" />
                                    <span>Store</span>
                                </Link>
                                <Link
                                    href="/admin/printing"
                                    className="flex items-center gap-4 px-3 py-2 text-base font-medium rounded-md hover:bg-accent transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Printer className="h-5 w-5 text-muted-foreground" />
                                    <span>Printing</span>
                                </Link>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    <Link
                        href="/admin/products"
                        className="flex items-center gap-4 px-3 py-3 text-base font-medium rounded-md hover:bg-accent transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <Package className="h-6 w-6" />
                        Manage Products
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/admin" className="text-lg font-bold flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                </Link>
                <div className="h-6 w-px bg-border" />
                 
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                    Point of Sale
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                       <Link href="/admin/store" className="flex items-center gap-2 cursor-pointer">
                         <Store className="h-4 w-4" /> Store
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                       <Link href="/admin/printing" className="flex items-center gap-2 cursor-pointer">
                         <Printer className="h-4 w-4" /> Printing
                       </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link
                  href="/admin/products"
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Manage Products
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)} className="relative">
                <ShoppingBag className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
                <span className="sr-only">Open Order</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
