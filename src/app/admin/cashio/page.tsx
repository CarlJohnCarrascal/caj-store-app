import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import CashTransactionTable from './components/CashTransactionTable';
import Link from 'next/link';

export default function CashIOPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cash IO Transactions</h1>
        <Button asChild>
          <Link href="/admin/cashio/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Link>
        </Button>
      </div>
      <CashTransactionTable />
    </div>
  );
}
