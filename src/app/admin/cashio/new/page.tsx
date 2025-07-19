
'use client';

import { getAccounts } from '@/lib/data';
import CashTransactionForm from '../components/CashTransactionForm';
import { Suspense, useEffect, useState } from 'react';
import { Account } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

function NewCashTransactionForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const searchParams = useSearchParams();
  const sharedText = searchParams.get('text');
  
  const extractedData: { [key: string]: string | undefined } = {};
  for (const [key, value] of searchParams.entries()) {
    extractedData[key] = value;
  }
  
  // Also pass the message parameter if it exists from scan page
  if (searchParams.has('message')) {
    extractedData.message = searchParams.get('message') || '';
  }

  useEffect(() => {
    async function fetchAccounts() {
      const fetchedAccounts = await getAccounts();
      setAccounts(fetchedAccounts);
    }
    fetchAccounts();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Cash Transaction</h1>
      <CashTransactionForm accounts={accounts} sharedText={sharedText || undefined} transaction={extractedData as any} />
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
