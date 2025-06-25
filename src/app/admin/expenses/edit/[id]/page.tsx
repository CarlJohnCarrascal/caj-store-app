import { getExpenseById, getExpenses } from '@/lib/data';
import ExpenseForm from '../../components/ExpenseForm';
import { notFound } from 'next/navigation';

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const expense = await getExpenseById(params.id);
  const allExpenses = await getExpenses();
  const categories = [...new Set(allExpenses.map(e => e.category))];
  
  if (!expense) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Expense</h1>
      <ExpenseForm expense={expense} categories={categories} />
    </div>
  );
}
