
'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle, Camera, Search } from 'lucide-react';
import CashTransactionTable from './components/CashTransactionTable';
import Link from 'next/link';
import { useState } from 'react';

export default function CashIOPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cash IO</h1>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setIsSearchOpen(true)}>
             <Search className="h-5 w-5 md:mr-2" />
             <span className="hidden md:inline">Search</span>
           </Button>
           <Button asChild variant="outline">
            <Link href="/admin/cashio/scan">
              <Camera className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Scan Image</span>
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/cashio/new">
              <PlusCircle className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Add Transaction</span>
            </Link>
          </Button>
        </div>
      </div>
      <CashTransactionTable isSearchOpen={isSearchOpen} onSearchOpenChange={setIsSearchOpen} />
    </div>
  );
}
