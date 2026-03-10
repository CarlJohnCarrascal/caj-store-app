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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Providers>
        <div className="h-screen w-full bg-background text-foreground flex flex-col min-w-[1024px]">
        <PosHeader isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
        <div className={cn(
          "flex-grow grid grid-rows-1 gap-6 p-6 overflow-hidden transition-[grid-template-columns] duration-300",
          isCollapsed ? "grid-cols-[80px_1fr_380px]" : "grid-cols-[280px_1fr_380px]"
        )}>
            <PosSidebar isCollapsed={isCollapsed} />
            <main className="flex flex-col overflow-hidden">
            {children}
            </main>
            <PosCheckout />
        </div>
        </div>
    </Providers>
  );
}
