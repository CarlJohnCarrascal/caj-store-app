
'use client';

import { getExpenseById, getExpenses } from '@/lib/data';
import ExpenseForm from '@/app/admin/expenses/components/ExpenseForm';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

export default function PosEditExpensePage() {
  const params = useParams();
  const id = params.id as string;
  const { activeStoreId } = useAuth();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !activeStoreId) return;
    async function fetchData() {
      try {
        const [expenseData, allExpenses] = await Promise.all([
          getExpenseById(activeStoreId!, id),
          getExpenses(activeStoreId!)
        ]);
        if (!expenseData) {
          notFound();
          return;
        }
        setExpense(expenseData);
        setCategories([...new Set(allExpenses.map(e => e.category))]);
      } catch (err: any) {
        setError("Failed to load expense data.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, activeStoreId]);

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error || !expense) {
    return (
      <Card className="mt-4 border-destructive">
        <CardHeader><h1 className="text-destructive">An Error Occurred</h1></CardHeader>
        <CardContent><p>{error || "Expense not found."}</p></CardContent>
      </Card>
    );
  }

  return (
     <div className="h-full overflow-y-auto pr-4 -mr-4">
        <ExpenseForm expense={expense} categories={categories} />
     </div>
  );
}
