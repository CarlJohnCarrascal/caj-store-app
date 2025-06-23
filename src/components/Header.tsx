
'use client';

import Link from 'next/link';
import { ShoppingBag, Menu, Store, Printer, Package, LayoutDashboard, ChevronDown, Landmark, Users, ArrowRightLeft, Library, History, Smartphone, Wrench } from 'lucide-react';
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
                    <Menu className="h-7 w-7" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm">
                  <SheetHeader>
                     <SheetTitle className="text-left">
                        <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2">
                            <LayoutDashboard />
                            CajStore
                        </Link>
                     </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-1 mt-4">
                    <Accordion type="multiple" className="w-full">
                        <AccordionItem value="pos" className="border-b-0">
                            <AccordionTrigger className="flex items-center gap-4 px-3 py-4 text-lg font-medium rounded-md hover:bg-accent transition-colors hover:no-underline">
                                <div className="flex items-center gap-4">
                                  <Store className="h-6 w-6" />
                                  Point of Sale
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-10 space-y-1">
                                <Link href="/admin/store" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <Store className="h-5 w-5 text-muted-foreground" /><span>Store</span>
                                </Link>
                                <Link href="/admin/printing" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <Printer className="h-5 w-5 text-muted-foreground" /><span>Printing</span>
                                </Link>
                                <Link href="/admin/e-loading" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <Smartphone className="h-5 w-5 text-muted-foreground" /><span>E-loading</span>
                                </Link>
                                <Link href="/admin/other-services" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <Wrench className="h-5 w-5 text-muted-foreground" /><span>Other Services</span>
                                </Link>
                                <Link href="/admin/cashio" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <ArrowRightLeft className="h-5 w-5 text-muted-foreground" /><span>Cash IO</span>
                                </Link>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="management" className="border-b-0">
                            <AccordionTrigger className="flex items-center gap-4 px-3 py-4 text-lg font-medium rounded-md hover:bg-accent transition-colors hover:no-underline">
                                <div className="flex items-center gap-4">
                                  <Package className="h-6 w-6" />
                                  Management
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-10 space-y-1">
                                <Link href="/admin/products" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <Package className="h-5 w-5 text-muted-foreground" /><span>Products</span>
                                </Link>
                                <Link href="/admin/accounts" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <Landmark className="h-5 w-5 text-muted-foreground" /><span>Accounts</span>
                                </Link>
                                <Link href="/admin/customers" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <Users className="h-5 w-5 text-muted-foreground" /><span>Customers</span>
                                </Link>
                                <Link href="/admin/collections" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <Library className="h-5 w-5 text-muted-foreground" /><span>Collections</span>
                                </Link>
                                <Link href="/admin/transactions" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                    <History className="h-5 w-5 text-muted-foreground" /><span>Transactions</span>
                                </Link>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/admin" className="text-lg font-bold flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5" />
                    CajStore
                </Link>
                <div className="h-6 w-px bg-border" />
                 
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                    Point of Sale <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild><Link href="/admin/store" className="flex items-center gap-2 cursor-pointer"><Store className="h-4 w-4" /> Store</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/printing" className="flex items-center gap-2 cursor-pointer"><Printer className="h-4 w-4" /> Printing</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/e-loading" className="flex items-center gap-2 cursor-pointer"><Smartphone className="h-4 w-4" /> E-loading</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/other-services" className="flex items-center gap-2 cursor-pointer"><Wrench className="h-4 w-4" /> Other Services</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/cashio" className="flex items-center gap-2 cursor-pointer"><ArrowRightLeft className="h-4 w-4" /> Cash IO</Link></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                    Management <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild><Link href="/admin/products" className="flex items-center gap-2 cursor-pointer"><Package className="h-4 w-4" /> Products</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/accounts" className="flex items-center gap-2 cursor-pointer"><Landmark className="h-4 w-4" /> Accounts</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/customers" className="flex items-center gap-2 cursor-pointer"><Users className="h-4 w-4" /> Customers</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/collections" className="flex items-center gap-2 cursor-pointer"><Library className="h-4 w-4" /> Collections</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/admin/transactions" className="flex items-center gap-2 cursor-pointer"><History className="h-4 w-4" /> Transactions</Link></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)} className="relative">
                <ShoppingBag className="h-7 w-7" />
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
