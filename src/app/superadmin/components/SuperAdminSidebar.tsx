'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, Users, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/superadmin', icon: Home },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Stores', href: '/admin/stores', icon: Store },
];

export function SuperAdminSidebar() {
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
              className="w-full justify-start text-base h-12"
            >
              <Link href={item.href}>
                <item.icon className="mr-4 h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </aside>
  );
}
