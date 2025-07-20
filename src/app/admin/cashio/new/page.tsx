
'use client';

import { getAccounts } from '@/lib/data';
import CashTransactionForm from '../components/CashTransactionForm';
import { Suspense, useEffect, useState } from 'react';
import { Account } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

function NewCashTransactionForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const searchParams = useSearchParams();
  
  // Create a base object for the new transaction with defaults
  const transactionDefaults = {
    transactionType: 'Cash In',
    paymentMethod: 'Gcash',
    status: 'Delivered',
    accountName: '',
    accountNumber: '',
    amount: 0,
    fee: 0,
    reference: '',
    message: '',
    datetime: '',
  };

  // Override defaults with any parameters from the URL
  const extractedData: { [key: string]: any } = {};
  for (const [key, value] of searchParams.entries()) {
    // The date from the scanner comes in as `datetime`, but the form input expects it to be `datetime`.
    // It's already correctly named in the scanner page logic.
    extractedData[key] = value;
  }
  
  const transaction = { ...transactionDefaults, ...extractedData };


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
      <CashTransactionForm accounts={accounts} transaction={transaction as any} />
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
