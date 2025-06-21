'use client';

import Link from 'next/link';
import { ShoppingBag, ChevronDown, Menu } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
                    <SheetTitle className="text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-1 mt-4">
                    <Accordion type="single" collapsible className="w-full">
                       <AccordionItem value="pos" className="border-b-0">
                          <AccordionTrigger className="py-3 text-base font-medium hover:no-underline">Point of Sale</AccordionTrigger>
                          <AccordionContent>
                             <div className="flex flex-col space-y-4 pl-6 pt-2">
                                <Link href="/" className="text-muted-foreground hover:text-primary" onClick={() => setIsMenuOpen(false)}>Store</Link>
                                <Link href="/printing" className="text-muted-foreground hover:text-primary" onClick={() => setIsMenuOpen(false)}>Printing</Link>
                             </div>
                          </AccordionContent>
                       </AccordionItem>
                    </Accordion>
                    <Link href="/admin" className="px-3 py-3 text-base font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                      Admin
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Desktop Nav */}
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
            
            <div className="flex items-center gap-2">
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
