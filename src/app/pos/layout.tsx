import { PosSidebar } from './components/PosSidebar';
import { PosCheckout } from './components/PosCheckout';
import { PosHeader } from './components/PosHeader';
import { Providers } from '@/components/Providers';

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
        <div className="h-screen w-full bg-background text-foreground flex flex-col">
        <PosHeader />
        <div className="flex-grow grid grid-cols-[280px_1fr_380px] grid-rows-1 gap-6 p-6 overflow-hidden">
            <PosSidebar />
            <main className="flex flex-col overflow-hidden">
            {children}
            </main>
            <PosCheckout />
        </div>
        </div>
    </Providers>
  );
}
