'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle, Camera, Search } from 'lucide-react';
import CashTransactionTable from '@/app/admin/cashio/components/CashTransactionTable'; // Re-use the table
import Link from 'next/link';
import { useState } from 'react';
// History is on sidebar, so no need for OrderHistoryDialog

export default function PosCashIOPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // History button is in the POS sidebar, so we don't need the isHistoryOpen state here.

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-3xl font-bold">Cash IO</h1>
        <div className="flex gap-2">
           {/* No history button here, it's on the main sidebar */}
           <Button variant="outline" onClick={() => setIsSearchOpen(true)}>
             <Search className="h-5 w-5 md:mr-2" />
             <span className="hidden md:inline">Search</span>
           </Button>
           <Button asChild variant="outline">
            <Link href="/pos/cashio/scan">
              <Camera className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Scan</span>
            </Link>
          </Button>
          <Button asChild>
            <Link href="/pos/cashio/new">
              <PlusCircle className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Add</span>
            </Link>
          </Button>
        </div>
      </div>
      {/* Make table scrollable to fit layout */}
      <div className="flex-grow overflow-auto">
        <CashTransactionTable isSearchOpen={isSearchOpen} onSearchOpenChange={setIsSearchOpen} />
      </div>
    </div>
  );
}
