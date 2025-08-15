

'use client';

import { getAccounts } from '@/lib/data';
import CashTransactionForm from '../components/CashTransactionForm';
import { Suspense, useEffect, useState } from 'react';
import { Account } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

function NewCashTransactionForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const searchParams = useSearchParams();
  
  const [initialTransaction, setInitialTransaction] = useState<any | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      const fetchedAccounts = await getAccounts();
      setAccounts(fetchedAccounts);
    }
    fetchAccounts();
  }, []);

  useEffect(() => {
    // Create a base object for the new transaction with defaults
    const transactionDefaults = {
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
      tempImageDataUri: '',
    };

    const lastUsedAccountId = typeof window !== 'undefined' ? localStorage.getItem('lastUsedAccountId') : null;
    if (lastUsedAccountId) {
      transactionDefaults.accountUsedId = lastUsedAccountId;
    }
    
    // Override defaults with any parameters from the URL
    const extractedData: { [key: string]: any } = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'tempImageDataUri') continue;
      extractedData[key] = value;
    }
    
    if (typeof window !== 'undefined') {
        const storedImage = localStorage.getItem('temp_receipt_image');
        if (storedImage) {
            extractedData['tempImageDataUri'] = storedImage;
            localStorage.removeItem('temp_receipt_image');
        }
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
