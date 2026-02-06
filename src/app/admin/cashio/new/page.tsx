

'use client';

import { getAccounts } from '@/lib/data';
import CashTransactionForm from '../components/CashTransactionForm';
import { Suspense, useEffect, useState } from 'react';
import { Account } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

function NewCashTransactionForm() {
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
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Cash Transaction</h1>
      <CashTransactionForm accounts={accounts} transaction={initialTransaction} />
    </div>
  );
}

export default function NewCashTransactionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewCashTransactionForm />
    </Suspense>
  );
}
