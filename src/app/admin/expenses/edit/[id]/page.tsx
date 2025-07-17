
'use client';

import { getExpenseById, getExpenses } from '@/lib/data';
import ExpenseForm from '../../components/ExpenseForm';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function EditExpensePage() {
  const params = useParams();
  const id = params.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      try {
        const [expenseData, allExpenses] = await Promise.all([
          getExpenseById(id),
          getExpenses()
        ]);
        if (!expenseData) {
          notFound();
          return;
        }
        setExpense(expenseData);
        setCategories([...new Set(allExpenses.map(e => e.category))]);
      } catch (err: any) {
        setError("Failed to load expense data. You may not have permission to view this page.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6"><Skeleton className="h-9 w-64" /></h1>
        <Card>
          <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <Card className="mt-4 border-destructive">
        <CardHeader><CardTitle className="text-destructive">An Error Occurred</CardTitle></CardHeader>
        <CardContent><p>{error || "Expense not found."}</p></CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Expense</h1>
      <ExpenseForm expense={expense} categories={categories} />
    </div>
  );
}
