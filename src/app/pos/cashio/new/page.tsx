
'use client';

import { getAccounts } from '@/lib/data';
import CashTransactionForm from '@/app/admin/cashio/components/CashTransactionForm';
import { Suspense, useEffect, useState } from 'react';
import { Account } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

function PosNewCashTransactionForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const searchParams = useSearchParams();
  const { activeStoreId } = useAuth();
  
  const [initialTransaction, setInitialTransaction] = useState<any | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      if (!activeStoreId) return;
      const fetchedAccounts = await getAccounts(activeStoreId);
      setAccounts(fetchedAccounts);
    }
    fetchAccounts();
  }, [activeStoreId]);

  useEffect(() => {
    // Create a base object for the new transaction with defaults
    const transactionDefaults: any = {
      transactionType: 'Cash In',
      paymentMethod: 'Gcash',
      status: 'Processing',
      accountName: '',
      accountNumber: '',
      amount: 0,
      fee: 0,
      reference: '',
      message: '',
      datetime: '',
      fromScanned: '',
      receiptImageUrl: '',
    };

    const lastUsedAccountId = typeof window !== 'undefined' ? localStorage.getItem('lastUsedAccountId') : null;
    if (lastUsedAccountId) {
      transactionDefaults.accountUsedId = lastUsedAccountId;
    }
    
    // Override defaults with any parameters from the URL
    const extractedData: { [key: string]: any } = {};
    for (const [key, value] of searchParams.entries()) {
        extractedData[key] = value;
    }
    
    setInitialTransaction({ ...transactionDefaults, ...extractedData });

  }, [searchParams]);

  if (!initialTransaction) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <CashTransactionForm accounts={accounts} transaction={initialTransaction} />
  );
}

export default function PosNewCashTransactionPage() {
  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold">Add New Cash Transaction</h1>
        <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
          <PosNewCashTransactionForm />
        </Suspense>
    </div>
  );
}
