
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowRightLeft, Printer, History, Smartphone, Wrench, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Products', href: '/pos', icon: ShoppingCart },
  { name: 'Cash IO', href: '/pos/cashio', icon: ArrowRightLeft },
  { name: 'Printing', href: '/pos/printing', icon: Printer },
  { name: 'E-loading', href: '/pos/e-loading', icon: Smartphone },
  { name: 'Other Services', href: '/pos/other-services', icon: Wrench },
  { name: 'Expenses', href: '/admin/expenses', icon: Receipt },
];

interface PosSidebarProps {
  isCollapsed: boolean;
  onHistoryClick: () => void;
}

export function PosSidebar({ isCollapsed, onHistoryClick }: PosSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="bg-card rounded-lg p-4 flex flex-col gap-2">
      <div className="flex-grow space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Button 
              key={item.name} 
              asChild 
              variant={isActive ? 'default' : 'ghost'}
              className={cn("w-full justify-start text-base h-14", isCollapsed && "justify-center")}
              title={isCollapsed ? item.name : ""}
            >
              <Link href={item.href}>
                <item.icon className={cn("h-6 w-6", !isCollapsed && "mr-4")} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            </Button>
          );
        })}
      </div>
      <div className="flex-shrink-0">
        <Button 
            variant='ghost'
            className={cn("w-full justify-start text-base h-14", isCollapsed && "justify-center")}
            title={isCollapsed ? "Order History" : ""}
            onClick={onHistoryClick}
        >
            <History className={cn("h-6 w-6", !isCollapsed && "mr-4")} />
            {!isCollapsed && <span>History</span>}
        </Button>
      </div>
    </aside>
  );
}
