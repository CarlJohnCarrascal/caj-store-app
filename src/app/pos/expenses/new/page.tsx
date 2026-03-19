
'use client';

import ExpenseForm from '@/app/admin/expenses/components/ExpenseForm';
import { getExpenses } from '@/lib/data';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function PosNewExpensePage() {
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
    <div className="h-full overflow-y-auto pr-4 -mr-4">
      <ExpenseForm categories={categories} />
    </div>
  );
}
