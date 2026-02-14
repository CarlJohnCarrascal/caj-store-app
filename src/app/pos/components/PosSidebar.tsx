'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, DollarSign, ArrowRightLeft, Printer, Package, BarChart3, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Products', href: '/pos', icon: ShoppingCart, color: 'bg-blue-600', hover: 'hover:bg-blue-700' },
  { name: 'Cash In', href: '/pos/cash-in', icon: DollarSign, color: 'bg-green-600', hover: 'hover:bg-green-700' },
  { name: 'Cash Out', href: '/pos/cash-out', icon: ArrowRightLeft, color: 'bg-red-600', hover: 'hover:bg-red-700' },
  { name: 'Printing', href: '/pos/printing', icon: Printer, color: 'bg-purple-600', hover: 'hover:bg-purple-700' },
  { name: 'Other Services', href: '/pos/other-services', icon: Wrench, color: 'bg-orange-500', hover: 'hover:bg-orange-600' },
  { name: 'Reports', href: '/admin/reports/sales', icon: BarChart3, color: 'bg-teal-600', hover: 'hover:bg-teal-700' },
];

export function PosSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-card rounded-lg p-4 flex flex-col gap-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href === '/pos' && pathname.startsWith('/pos/products'));
        return (
          <Button 
            key={item.name} 
            asChild 
            className={cn(
              "w-full justify-start text-lg h-16 text-white",
              isActive ? `${item.color} ${item.hover}` : 'bg-card text-foreground hover:bg-muted'
            )}
          >
            <Link href={item.href}>
              <item.icon className="mr-4 h-6 w-6" />
              {item.name}
            </Link>
          </Button>
        );
      })}
    </aside>
  );
}
