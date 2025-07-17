
'use client';

import ExpenseForm from '../components/ExpenseForm';
import { getExpenses } from '@/lib/data';
import { useEffect, useState } from 'react';

export default function NewExpensePage() {
  const [categories, setCategories] = useState<string[]>([]);
  
  useEffect(() => {
    async function fetchCategories() {
        const expenses = await getExpenses();
        setCategories([...new Set(expenses.map(e => e.category))]);
    }
    fetchCategories();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Expense</h1>
      <ExpenseForm categories={categories} />
    </div>
  );
}
