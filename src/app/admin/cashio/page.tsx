import { Button } from '@/components/ui/button';
import { PlusCircle, Camera } from 'lucide-react';
import CashTransactionTable from './components/CashTransactionTable';
import Link from 'next/link';

export default function CashIOPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cash IO Transactions</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/cashio/new">
              <PlusCircle className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Add Transaction</span>
            </Link>
          </Button>
        </div>
      </div>
      <CashTransactionTable />
    </div>
  );
}
