import { Button } from '@/components/ui/button';
import { getCashTransactions, getAccounts } from '@/lib/data';
import { PlusCircle } from 'lucide-react';
import CashTransactionTable from './components/CashTransactionTable';
import { CashTransaction } from '@/lib/types';
import { Card } from '@/components/ui/card';

export default async function CashIOPage() {
  const transactions: CashTransaction[] = await getCashTransactions();
  const accounts = await getAccounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cash IO Transactions</h1>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>
      <CashTransactionTable transactions={transactions} accounts={accounts} />
    </div>
  );
}
