
'use client';

import ExpenseForm from '../components/ExpenseForm';
import { getExpenses } from '@/lib/data';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function NewExpensePage() {
  const [categories, setCategories] = useState<string[]>([]);
  const { activeStoreId } = useAuth();
  
  useEffect(() => {
    if (!activeStoreId) return;
    async function fetchCategories() {
        const expenses = await getExpenses(activeStoreId!);
        setCategories([...new Set(expenses.map(e => e.category))]);
    }
    fetchCategories();
  }, [activeStoreId]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Expense</h1>
      <ExpenseForm categories={categories} />
    </div>
  );
}
