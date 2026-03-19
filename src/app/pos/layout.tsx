
'use client';

import { PosSidebar } from './components/PosSidebar';
import { PosCheckout } from './components/PosCheckout';
import { PosHeader } from './components/PosHeader';
import { Providers } from '@/components/Providers';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCheckoutCollapsed, setIsCheckoutCollapsed] = useState(false);

  const gridClasses = isSidebarCollapsed 
  ? (isCheckoutCollapsed ? "grid-cols-[80px_1fr_80px]" : "grid-cols-[80px_1fr_380px]")
  : (isCheckoutCollapsed ? "grid-cols-[280px_1fr_80px]" : "grid-cols-[280px_1fr_380px]");

  return (
    <Providers>
        <div className="h-screen w-full bg-background text-foreground flex flex-col min-w-[1024px]">
        <PosHeader isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <div className={cn(
          "flex-grow grid grid-rows-1 gap-6 p-6 overflow-hidden transition-[grid-template-columns] duration-300",
          gridClasses
        )}>
            <PosSidebar isCollapsed={isSidebarCollapsed} />
            <main className="flex flex-col overflow-y-auto pr-4 -mr-4">
            {children}
            </main>
            <PosCheckout isCollapsed={isCheckoutCollapsed} onToggleCollapse={() => setIsCheckoutCollapsed(p => !p)} />
        </div>
        </div>
    </Providers>
  );
}
