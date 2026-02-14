'use client';

import Link from 'next/link';
import { ShoppingCart, Menu, Store, Printer, Package, LayoutDashboard, ChevronDown, Landmark, Users, ArrowRightLeft, Library, History, Smartphone, Wrench, ShoppingBag, Receipt, BarChart, LogOut, User as UserIcon, DollarSign, Settings, FileInput, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { CartSheet } from '@/components/CartSheet';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { StoreSwitcher } from './StoreSwitcher';

export default function Header() {
  const { cartCount, isCartOpen, setCartOpen } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';
  const { user, signOut, isAdmin, activeStoreId } = useAuth();

  return (
    <>
      <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu */}
              {activeStoreId && (
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden max-[400px]:h-12 max-[400px]:w-12">
                      <Menu className="h-7 w-7 max-[400px]:h-8 max-[400px]:w-8" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-xs sm:max-w-sm flex flex-col p-0">
                    <SheetHeader className="p-6 pb-2">
                      <SheetTitle className="text-left">
                          <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2">
                              <LayoutDashboard />
                              CajStore
                          </Link>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="p-4">
                      <StoreSwitcher onStoreSwitch={() => setIsMenuOpen(false)} />
                    </div>
                    <ScrollArea className="flex-1">
                      <nav className="flex flex-col space-y-1 p-6 pt-2">
                        <Accordion type="multiple" className="w-full">
                            <AccordionItem value="pos" className="border-b-0">
                                <AccordionTrigger className="flex items-center gap-4 px-3 py-4 text-lg font-medium rounded-md hover:bg-accent transition-colors hover:no-underline">
                                    <div className="flex items-center gap-4">
                                      <Store className="h-6 w-6" />
                                      Point of Sale
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-10 space-y-1">
                                    <Link href="/pos" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Laptop className="h-5 w-5 text-muted-foreground" /><span>POS Mode</span>
                                    </Link>
                                    <Link href="/admin/store" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Store className="h-5 w-5 text-muted-foreground" /><span>Store</span>
                                    </Link>
                                    <Link href="/admin/cashio" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <ArrowRightLeft className="h-5 w-5 text-muted-foreground" /><span>Cash IO</span>
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
                                    <Link href="/admin/expenses" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Receipt className="h-5 w-5 text-muted-foreground" /><span>Expenses</span>
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
                                    <Link href="/admin/stores" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Store className="h-5 w-5 text-muted-foreground" /><span>Stores</span>
                                    </Link>
                                    <Link href="/admin/products" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Package className="h-5 w-5 text-muted-foreground" /><span>Products</span>
                                    </Link>
                                    <Link href="/admin/orders" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <ShoppingCart className="h-5 w-5 text-muted-foreground" /><span>Orders</span>
                                    </Link>
                                     <Link href="/admin/printing/prices" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Printer className="h-5 w-5 text-muted-foreground" /><span>Printing Prices</span>
                                    </Link>
                                    <Link href="/admin/cashio-fees" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <DollarSign className="h-5 w-5 text-muted-foreground" /><span>CashIO Fees</span>
                                    </Link>
                                    <Link href="/admin/import-cashio" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <FileInput className="h-5 w-5 text-muted-foreground" /><span>Import CashIO</span>
                                    </Link>
                                    <Link href="/admin/accounts" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Landmark className="h-5 w-5 text-muted-foreground" /><span>Accounts</span>
                                    </Link>
                                    <Link href="/admin/customers" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Users className="h-5 w-5 text-muted-foreground" /><span>Customers</span>
                                    </Link>
                                    {isAdmin && (
                                        <Link href="/admin/users" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                            <UserIcon className="h-5 w-5 text-muted-foreground" /><span>Users</span>
                                        </Link>
                                    )}
                                    <Link href="/admin/collections" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Library className="h-5 w-5 text-muted-foreground" /><span>Collections</span>
                                    </Link>
                                    <Link href="/admin/activity-logs" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <History className="h-5 w-5 text-muted-foreground" /><span>Activity Logs</span>
                                    </Link>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="reports" className="border-b-0">
                                <AccordionTrigger className="flex items-center gap-4 px-3 py-4 text-lg font-medium rounded-md hover:bg-accent transition-colors hover:no-underline">
                                    <div className="flex items-center gap-4">
                                      <BarChart className="h-6 w-6" />
                                      Reports
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-10 space-y-1">
                                    <Link href="/admin/reports/sales" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Receipt className="h-5 w-5 text-muted-foreground" /><span>Sales</span>
                                    </Link>
                                    <Link href="/admin/reports/product" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Package className="h-5 w-5 text-muted-foreground" /><span>Product</span>
                                    </Link>
                                    <Link href="/admin/reports/customer" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Users className="h-5 w-5 text-muted-foreground" /><span>Customer</span>
                                    </Link>
                                    <Link href="/admin/reports/cashio" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <ArrowRightLeft className="h-5 w-5 text-muted-foreground" /><span>Cash IO</span>
                                    </Link>
                                    <Link href="/admin/reports/e-loading" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Smartphone className="h-5 w-5 text-muted-foreground" /><span>E-loading</span>
                                    </Link>
                                    <Link href="/admin/reports/printing" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Printer className="h-5 w-5 text-muted-foreground" /><span>Printing</span>
                                    </Link>
                                    <Link href="/admin/reports/other-service" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <Wrench className="h-5 w-5 text-muted-foreground" /><span>Other Service</span>
                                    </Link>
                                </AccordionContent>
                            </AccordionItem>
                            {isAdmin && (
                              <AccordionItem value="system" className="border-b-0">
                                <AccordionTrigger className="flex items-center gap-4 px-3 py-4 text-lg font-medium rounded-md hover:bg-accent transition-colors hover:no-underline">
                                    <div className="flex items-center gap-4">
                                      <Settings className="h-6 w-6" />
                                      System
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-10 space-y-1">
                                    <Link href="/admin/system/cashio-report-fix" className="flex items-center gap-4 px-3 py-3 text-lg font-medium rounded-md hover:bg-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                                        <ArrowRightLeft className="h-5 w-5 text-muted-foreground" /><span>CashIO Report Fix</span>
                                    </Link>
                                </AccordionContent>
                              </AccordionItem>
                            )}
                        </Accordion>
                      </nav>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}
              
              <div className="hidden md:flex items-center gap-2">
                <Link href="/admin" className="text-lg font-bold flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5" />
                </Link>
                 <StoreSwitcher />
              </div>

              {/* Desktop Nav */}
              {activeStoreId && (
                <nav className="hidden md:flex items-center space-x-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                      Point of Sale <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild><Link href="/pos" className="flex items-center gap-2 cursor-pointer"><Laptop className="h-4 w-4" /> POS Mode</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href="/admin/store" className="flex items-center gap-2 cursor-pointer"><Store className="h-4 w-4" /> Store</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/cashio" className="flex items-center gap-2 cursor-pointer"><ArrowRightLeft className="h-4 w-4" /> Cash IO</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/printing" className="flex items-center gap-2 cursor-pointer"><Printer className="h-4 w-4" /> Printing</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/e-loading" className="flex items-center gap-2 cursor-pointer"><Smartphone className="h-4 w-4" /> E-loading</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/other-services" className="flex items-center gap-2 cursor-pointer"><Wrench className="h-4 w-4" /> Other Services</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/expenses" className="flex items-center gap-2 cursor-pointer"><Receipt className="h-4 w-4" /> Expenses</Link></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                      Management <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild><Link href="/admin/stores" className="flex items-center gap-2 cursor-pointer"><Store className="h-4 w-4" /> Stores</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/products" className="flex items-center gap-2 cursor-pointer"><Package className="h-4 w-4" /> Products</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/orders" className="flex items-center gap-2 cursor-pointer"><ShoppingCart className="h-4 w-4" /> Orders</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href="/admin/printing/prices" className="flex items-center gap-2 cursor-pointer"><Printer className="h-4 w-4" /> Printing Prices</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/cashio-fees" className="flex items-center gap-2 cursor-pointer"><DollarSign className="h-4 w-4" /> CashIO Fees</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/import-cashio" className="flex items-center gap-2 cursor-pointer"><FileInput className="h-4 w-4" /> Import CashIO</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/accounts" className="flex items-center gap-2 cursor-pointer"><Landmark className="h-4 w-4" /> Accounts</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/customers" className="flex items-center gap-2 cursor-pointer"><Users className="h-4 w-4" /> Customers</Link></DropdownMenuItem>
                      {isAdmin && (
                          <DropdownMenuItem asChild><Link href="/admin/users" className="flex items-center gap-2 cursor-pointer"><UserIcon className="h-4 w-4" /> Users</Link></DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild><Link href="/admin/collections" className="flex items-center gap-2 cursor-pointer"><Library className="h-4 w-4" /> Collections</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href="/admin/activity-logs" className="flex items-center gap-2 cursor-pointer"><History className="h-4 w-4" /> Activity Logs</Link></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                      Reports <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild><Link href="/admin/reports/sales" className="flex items-center gap-2 cursor-pointer"><Receipt className="h-4 w-4" /> Sales</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/reports/product" className="flex items-center gap-2 cursor-pointer"><Package className="h-4 w-4" /> Product</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/reports/customer" className="flex items-center gap-2 cursor-pointer"><Users className="h-4 w-4" /> Customer</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/reports/cashio" className="flex items-center gap-2 cursor-pointer"><ArrowRightLeft className="h-4 w-4" /> Cash IO</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/reports/e-loading" className="flex items-center gap-2 cursor-pointer"><Smartphone className="h-4 w-4" /> E-loading</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/reports/printing" className="flex items-center gap-2 cursor-pointer"><Printer className="h-4 w-4" /> Printing</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/admin/reports/other-service" className="flex items-center gap-2 cursor-pointer"><Wrench className="h-4 w-4" /> Other Service</Link></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                        System <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem asChild><Link href="/admin/system/cashio-report-fix" className="flex items-center gap-2 cursor-pointer"><ArrowRightLeft className="h-4 w-4" /> CashIO Report Fix</Link></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </nav>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {activeStoreId && (
                <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)} className="relative">
                  <ShoppingBag className="h-7 w-7" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {cartCount}
                    </span>
                  )}
                  <span className="sr-only">Open Order</span>
                </Button>
              )}
              {authEnabled && user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                       <Avatar className="h-8 w-8">
                         <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.[0].toUpperCase()}</AvatarFallback>
                       </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>
      <CartSheet open={isCartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
