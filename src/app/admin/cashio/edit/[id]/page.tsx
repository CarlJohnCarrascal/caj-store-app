
'use client';

import { getCashTransactionById, getAccounts } from '@/lib/data';
import CashTransactionForm from '../../components/CashTransactionForm';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Account, CashTransaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

export default function EditCashTransactionPage() {
  const params = useParams();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<CashTransaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
        setIsLoading(false);
        setError("Transaction ID is missing from the URL.");
        return;
    };

    async function fetchData() {
      try {
        const [transactionData, accountsData] = await Promise.all([
          getCashTransactionById(id),
          getAccounts(),
        ]);
        
        if (!transactionData) {
          notFound(); // This will render the closest not-found.js file
          return;
        }

        // The datetime-local input needs a 'YYYY-MM-DDTHH:mm' format.
        // The date from DB is 'YYYY-MM-DDTHH:mm:ss+08:00'. We slice it.
        const formattedTransaction = {
          ...transactionData,
          datetime: transactionData.transactionDate ? transactionData.transactionDate.slice(0, 16) : '',
        };

        setTransaction(formattedTransaction as CashTransaction);
        setAccounts(accountsData);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Failed to load transaction data. You may not have permission to view this page or your session has expired.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6"><Skeleton className="h-9 w-72" /></h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
             <Skeleton className="h-[500px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">An Error Occurred</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Cash Transaction</h1>
      {transaction && <CashTransactionForm transaction={transaction} accounts={accounts} />}
    </div>
  );
}
