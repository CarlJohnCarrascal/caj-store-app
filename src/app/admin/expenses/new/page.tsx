import ExpenseForm from '../components/ExpenseForm';
import { getExpenses } from '@/lib/data';

export default async function NewExpensePage() {
  const expenses = await getExpenses();
  const categories = [...new Set(expenses.map(e => e.category))];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Expense</h1>
      <ExpenseForm categories={categories} />
    </div>
  );
}
